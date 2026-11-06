'use strict';
const L = require('./lib.js');
const f = L.loadFile(process.argv[2]);
const a = L.assemble(f.all, f.configs.find(x => x.N === +process.argv[3]).name);
const N = L.nativeModel.build(a.parsed);
const R = L.Proc.resolve(N);
const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
const RV = R.vertices instanceof Map ? R.vertices : new Map(R.vertices.map(v => [v.id, v]));
const edgeSamples = new Map();
for (const [id] of N.edges) { const r = RE.get(id); const arc = L.edgeArc(r, RV); edgeSamples.set(id, { pts: L.sampleArc(arc, RV, r), arc }); }
const rows = [];
for (const F of N.faces) {
  const fp = L.facePolygons(F, N, edgeSamples);
  if (!fp.notes.length) continue;
  rows.push({ face: F.id, type: F.surface.type, loops: F.loops.map(l => l.coedges.length), notes: fp.notes.slice(0, 2), polys: fp.polys.map(p => p && { n: p.pts.length, area: +p.area.toExponential(2), bb: p.bb.map(x => +x.toFixed(5)) }) });
}
console.log(JSON.stringify(rows.slice(0, 4), null, 0));
console.log('flagged', rows.length, 'of', N.faces.length, 'types', JSON.stringify(rows.reduce((s, r) => (s[r.type] = (s[r.type] || 0) + 1, s), {})));
