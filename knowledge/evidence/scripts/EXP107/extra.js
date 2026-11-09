'use strict';
// EXP107 second pass: where do the 36 "wrong" id matches' missing edge ids live, and how do the geometry matches compare.
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const CORPUS = '/home/user/sldprt-research-dump';
const det = fs.readFileSync(__dirname + '/out/details.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const wrongFiles = [...new Set(det.filter(x => x.kind === 'wrong').map(x => x.file))];
const geomFiles = [...new Set(det.filter(x => x.kind === 'geometry_multi_pass').map(x => x.file))];
const out = { wrong: [], geometry: {} };
const findFile = rel => path.join(CORPUS, rel);
const TAG = { 4001: 'plane', 4002: 'cylinder', 4003: 'cone', 4004: 'sphere', 4005: 'torus', 4006: 'bspline', 4007: 'blend', 4009: 'swept', 4010: 'spun' };
for (const rel of wrongFiles) {
  const p = L.loadPart(findFile(rel));
  const joined = J.join(p.df, p.M);
  const edgeOwner = new Map();   // displayId -> native edges with that displayId
  for (const e of p.M.edges.values()) { if (!edgeOwner.has(e.displayId)) edgeOwner.set(e.displayId, []); edgeOwner.get(e.displayId).push(e.id); }
  p.df.forEach((d, i) => {
    const j = joined[i]; if (!j.face) return;
    const r = L.verdict(p.M, d, j.face);
    if (r.v !== 'wrong') return;
    const want = L.displayEdgeIds(d), got = L.nativeEdgeIds(p.M, j.face);
    const missing = [...want].filter(x => !got.has(x));
    // any other native face whose edge ids cover the display set
    const cover = p.M.faces.filter(f => { const g = L.nativeEdgeIds(p.M, f); return [...want].every(x => g.has(x)); }).map(f => f.id);
    const missingExists = missing.map(x => (edgeOwner.get(x) || []).length);
    out.wrong.push({ file: rel.split('/').pop(), rawId: d.metadata.rawId, nat: j.face.id, how: j.how, nW: want.size, missing, missingNativeEdgeCount: missingExists, coveredBy: cover, surfChecked: r.surf.checked, surfOver6: r.surf.over6, surfMax: r.surf.max, cands: p.M.faces.filter(f => (f.displayId !== undefined ? f.displayId : f.id) === d.metadata.rawId).map(f => f.id) });
  });
}
// geometry matches: candidates that share the id and type; edge result and surface result per candidate
let stats = { geomFaces: 0, unchosenCandsEdgeEqual: 0, chosenEdgeEqual: 0, chosenEdgeNone: 0, twoEdgeEqual: 0, oneEdgeEqual: 0, noEdgeEqual: 0 };
const perFile = {};
for (const rel of geomFiles) {
  const p = L.loadPart(findFile(rel));
  const joined = J.join(p.df, p.M);
  p.df.forEach((d, i) => {
    const j = joined[i]; if (j.how !== 'geometry') return;
    stats.geomFaces++;
    const tagType = TAG[d.metadata.typeTag];
    const cands = p.M.faces.filter(f => (f.displayId !== undefined ? f.displayId : f.id) === d.metadata.rawId && (!tagType || f.surface.type === tagType));
    const eq = cands.filter(c => L.edgeCheck(p.M, d, c).res === 'equal');
    const chosenEq = L.edgeCheck(p.M, d, j.face).res;
    if (chosenEq === 'equal') stats.chosenEdgeEqual++; else if (chosenEq === 'none') stats.chosenEdgeNone++;
    if (eq.length >= 2) stats.twoEdgeEqual++; else if (eq.length === 1) stats.oneEdgeEqual++; else stats.noEdgeEqual++;
    stats.unchosenCandsEdgeEqual += eq.filter(c => c !== j.face).length;
    perFile[rel.split('/').pop()] = (perFile[rel.split('/').pop()] || 0) + 1;
  });
}
out.geometry = { stats, perFile };
fs.writeFileSync(__dirname + '/out/extra.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.geometry, null, 1));
const byFile = {}; for (const w of out.wrong) { byFile[w.file] = byFile[w.file] || { n: 0, coveredBy: 0, missingNoNative: 0, surfChecked: 0 }; const b = byFile[w.file]; b.n++; if (w.coveredBy.length) b.coveredBy++; if (w.missingNativeEdgeCount.some(x => x === 0)) b.missingNoNative++; if (w.surfChecked) b.surfChecked++; }
console.log(JSON.stringify(byFile, null, 1));
console.log(JSON.stringify(out.wrong.slice(0, 4), null, 0));
