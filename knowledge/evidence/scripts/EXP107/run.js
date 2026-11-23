'use strict';
// EXP107 corpus run. Writes out/parts.jsonl (one line per .SLDPRT) and out/details.jsonl (every wrong, silent-wrong, and control case).
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const CORPUS = '/home/user/sldprt-research-dump';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
  const p = path.join(d, e.name); return e.isDirectory() ? walk(p) : (/\.sldprt$/i.test(e.name) ? [p] : []);
});
const files = ['test files new', 'test files online', 'test files original'].flatMap(d => walk(path.join(CORPUS, d)));
// my own tag table (not imported from the join)
const TAG = { 4001: 'plane', 4002: 'cylinder', 4003: 'cone', 4004: 'sphere', 4005: 'torus', 4006: 'bspline', 4007: 'blend', 4009: 'swept', 4010: 'spun' };
const CHECKABLE = new Set(['plane', 'cylinder', 'cone', 'sphere', 'torus']);
const parts = fs.createWriteStream(path.join(OUT, 'parts.jsonl'));
const details = fs.createWriteStream(path.join(OUT, 'details.jsonl'));
// deterministic pick, not random: a different native face of the same surface type
const pickOther = (faces, nf, salt) => {
  const others = faces.filter(f => f !== nf && f.surface.type === nf.surface.type);
  if (!others.length) return null;
  return others[(Math.abs(salt) * 2654435761) % others.length];
};
const boundaryGross = (d, nf) => {
  const s = nf.surface; if (!CHECKABLE.has(s.type)) return null;
  const bnd = new Set(); for (const c of d.boundaryCycles || []) for (const v of c.vertices) bnd.add(v);
  for (const a of d.edgeAnnotations || []) if (a.id !== 0) for (const v of a.vertices) bnd.add(v);
  let max = 0; for (const i of bnd) { const r = Math.abs(L.resid(s, [d.vertices[3 * i], d.vertices[3 * i + 1], d.vertices[3 * i + 2]])); if (r > max) max = r; }
  return bnd.size ? max : null;
};
const summary = { files: files.length };
let done = 0;
for (const f of files) {
  const rel = path.relative(CORPUS, f);
  const rec = { file: rel, legacy: null, displayFaces: 0, withMetadata: 0, brepError: null, parseError: null, how: {}, verdicts: {}, surfChecked: 0, surfOver8: 0, wrongEdge: 0, wrongSurf: 0, silentWrongById: 0, geomMulti: 0, noneRecover: { 0: 0, 1: 0, many: 0 }, ctrl: { n: 0, rejected: 0, accepted: 0, acceptedStrict: 0, rejectedEdge: 0, rejectedSurf: 0, surfChecked: 0, surfRejected: 0, edgeOnlyAccepted: 0 }, gross: { n: 0, over1e3: 0 }, claimJoinNonNull: 0 };
  try {
    const p = L.loadPart(f);
    rec.legacy = p.legacy; rec.displayFaces = p.parseFaces; rec.withMetadata = p.df.length;
    if (!p.df.length) { parts.write(JSON.stringify(rec) + '\n'); continue; }
    if (!p.M) { rec.brepError = p.brepError; parts.write(JSON.stringify(rec) + '\n'); continue; }
    const joined = J.join(p.df, p.M);
    const faces = p.M.faces;
    p.df.forEach((d, i) => {
      const j = joined[i];
      rec.how[j.how] = (rec.how[j.how] || 0) + 1;
      const rawId = d.metadata.rawId, tagType = TAG[d.metadata.typeTag];
      if (j.face) {
        rec.claimJoinNonNull++;
        const r = L.verdict(p.M, d, j.face);
        rec.verdicts[r.v] = (rec.verdicts[r.v] || 0) + 1;
        if (r.surf.checked) { rec.surfChecked++; if (r.surf.over8) rec.surfOver8++; }
        if (r.edge.res === 'bad') rec.wrongEdge++;
        if (r.surf.checked && r.surf.over6 > 0) rec.wrongSurf++;
        const g = boundaryGross(d, j.face);
        if (g !== null) { rec.gross.n++; if (g > 1e-3) rec.gross.over1e3++; }
        if (r.v === 'wrong') details.write(JSON.stringify({ file: rel, kind: 'wrong', how: j.how, rawId, typeTag: d.metadata.typeTag, nat: j.face.id, surf: j.face.surface.type, edge: r.edge, surfRes: { checked: r.surf.checked, max: r.surf.max, over6: r.surf.over6, over8: r.surf.over8 } }) + '\n');
        // silent: matched by id (one candidate) and my check says wrong
        if (j.how === 'id' && r.v === 'wrong') { rec.silentWrongById++; details.write(JSON.stringify({ file: rel, kind: 'silent_id_wrong', rawId, nat: j.face.id }) + '\n'); }
        // geometry matches where another candidate also passes my check
        if (j.how === 'geometry') {
          const cands = faces.filter(f => (f.displayId !== undefined ? f.displayId : f.id) === rawId && (!tagType || f.surface.type === tagType));
          const passing = cands.filter(c => L.verdict(p.M, d, c).v !== 'wrong').map(c => c.id);
          if (passing.length > 1) { rec.geomMulti++; details.write(JSON.stringify({ file: rel, kind: 'geometry_multi_pass', rawId, chosen: j.face.id, passing }) + '\n'); }
        }
        // control: a different native face of the same surface type
        const other = pickOther(faces, j.face, rawId * 31 + i * 7);
        if (other) {
          const c = L.verdict(p.M, d, other);
          rec.ctrl.n++;
          if (c.v === 'wrong') { rec.ctrl.rejected++; if (c.edge.res === 'bad') rec.ctrl.rejectedEdge++; if (c.surf.checked && c.surf.over6 > 0) rec.ctrl.rejectedSurf++; }
          else { rec.ctrl.accepted++; if (c.v === 'right') rec.ctrl.acceptedStrict++; if (c.edge.res === 'equal' || c.edge.res === 'subset') rec.ctrl.edgeOnlyAccepted++; if (details.bytesWritten < 5e8 && rec.ctrl.accepted <= 3) details.write(JSON.stringify({ file: rel, kind: 'control_accepted', rawId, nat: j.face.id, control: other.id, verdict: c.v, edge: c.edge, surf: c.surf }) + '\n'); }
          if (c.surf.checked) { rec.ctrl.surfChecked++; if (c.surf.over6 > 0) rec.ctrl.surfRejected++; }
        }
      } else {
        // none / ambiguous: is there any native face (any id) whose edge ids equal the display's?
        if (j.how === 'none' || j.how === 'ambiguous') {
          const k = faces.filter(f => { const e = L.edgeCheck(p.M, d, f); return e.res === 'equal'; }).length;
          rec.noneRecover[k >= 2 ? 'many' : k] += 1;
        }
      }
    });
  } catch (e) { rec.parseError = e.message; }
  parts.write(JSON.stringify(rec) + '\n');
  done++; if (done % 20 === 0) console.error('done', done, '/', files.length);
}
parts.end(); details.end();
console.error('finished', done);
