'use strict';
// EXP107 third pass: boundary-only gross check on geometry matches, same-type controls, and edge-tied alternatives.
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const CORPUS = '/home/user/sldprt-research-dump';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => { const p = path.join(d, e.name); return e.isDirectory() ? walk(p) : (/\.sldprt$/i.test(e.name) ? [p] : []); });
const files = ['test files new', 'test files online', 'test files original'].flatMap(d => walk(path.join(CORPUS, d)));
const TAG = { 4001: 'plane', 4002: 'cylinder', 4003: 'cone', 4004: 'sphere', 4005: 'torus' };
const CHK = new Set(['plane', 'cylinder', 'cone', 'sphere', 'torus']);
const gross = (d, nf) => {
  if (!CHK.has(nf.surface.type)) return null;
  const bnd = new Set(); for (const c of d.boundaryCycles || []) for (const v of c.vertices) bnd.add(v);
  for (const a of d.edgeAnnotations || []) if (a.id !== 0) for (const v of a.vertices) bnd.add(v);
  if (!bnd.size) return null;
  let max = 0; for (const i of bnd) { const r = Math.abs(L.resid(nf.surface, [d.vertices[3 * i], d.vertices[3 * i + 1], d.vertices[3 * i + 2]])); if (r > max) max = r; }
  return max;
};
const acc = { matched: 0, grossChecked: 0, grossOver1mm: 0, ctrlChecked: 0, ctrlGrossPass: 0, ctrlGrossPassExamples: [], geomFaces: 0, geomGrossChecked: 0, geomGrossOver1mm: 0, ties: 0, tieAltGrossPass: 0, tieAltGrossPassExamples: [], byHow: {} };
let i0 = 0;
for (const f of files) {
  const p = L.loadPart(f); if (!p.M || !p.df.length) continue;
  const joined = J.join(p.df, p.M);
  const faces = p.M.faces;
  p.df.forEach((d, i) => {
    const j = joined[i]; if (!j.face) return;
    acc.matched++;
    const g = gross(d, j.face);
    if (g !== null) { acc.grossChecked++; if (g > 1e-3) acc.grossOver1mm++; }
    acc.byHow[j.how] = acc.byHow[j.how] || { n: 0, grossChecked: 0, over1mm: 0 };
    if (g !== null) { acc.byHow[j.how].grossChecked++; if (g > 1e-3) acc.byHow[j.how].over1mm++; }
    acc.byHow[j.how].n++;
    // same-type control, the same pick as run.js
    const others = faces.filter(x => x !== j.face && x.surface.type === j.face.surface.type);
    if (others.length && g !== null) {
      const o = others[(Math.abs(d.metadata.rawId * 31 + i * 7) * 2654435761) % others.length];
      const cg = gross(d, o);
      if (cg !== null) { acc.ctrlChecked++; if (cg <= 1e-3) { acc.ctrlGrossPass++; if (acc.ctrlGrossPassExamples.length < 8) acc.ctrlGrossPassExamples.push({ file: path.basename(f), raw: d.metadata.rawId, nat: j.face.id, ctrl: o.id, type: o.surface.type, grossCtrl: cg }); } }
    }
    if (j.how === 'geometry') {
      acc.geomFaces++; if (g !== null) { acc.geomGrossChecked++; if (g > 1e-3) acc.geomGrossOver1mm++; }
      const tagType = TAG[d.metadata.typeTag];
      const cands = faces.filter(x => (x.displayId !== undefined ? x.displayId : x.id) === d.metadata.rawId && (!tagType || x.surface.type === tagType));
      const eqAlt = cands.filter(c => c !== j.face && L.edgeCheck(p.M, d, c).res === 'equal');
      if (eqAlt.length) {
        acc.ties++;
        for (const c of eqAlt) { const cg = gross(d, c); if (cg !== null && cg <= 1e-3) { acc.tieAltGrossPass++; if (acc.tieAltGrossPassExamples.length < 8) acc.tieAltGrossPassExamples.push({ file: path.basename(f), raw: d.metadata.rawId, chosen: j.face.id, alt: c.id, grossChosen: g, grossAlt: cg, type: c.surface.type }); break; } }
      }
    }
  });
}
console.log(JSON.stringify(acc, null, 1));
