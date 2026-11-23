'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const c = f.configs.find(x => x.N === 268);
const a = L.assemble(f.all, c.name);
const N = L.nativeModel.build(a.parsed);
const R = L.Proc.resolve(N);
// display vertex with the lowest y over all display faces
let best = null;
for (const df of f.displayFaces) { if (!df.verts) continue; for (let i = 0; i < df.verts.length; i += 3) { const y = df.verts[i + 1]; if (!best || y < best.y) best = { y, x: df.verts[i], z: df.verts[i + 2], face: df.id }; } }
console.log('display lowest-y vertex', JSON.stringify(best));
// native vertices, edges, faces nearest to it
const P = [best.x, best.y, best.z];
const vs = [...N.vertices.values()].map(v => ({ id: v.id, p: v.p, d: L.G.dist ? 0 : Math.hypot(v.p[0] - P[0], v.p[1] - P[1], v.p[2] - P[2]) })).sort((p, q) => p.d - q.d);
console.log('nearest native vertices', JSON.stringify(vs.slice(0, 3).map(v => ({ id: v.id, p: v.p.map(x => +x.toFixed(6)), d: +v.d.toExponential(3) }))));
console.log('lowest native vertex y', Math.min(...[...N.vertices.values()].map(v => v.p[1])));
const RV = R.vertices instanceof Map ? R.vertices : new Map(R.vertices.map(v => [v.id, v]));
for (const [id, E] of N.edges) {
  const RE = (R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]))).get(id);
  const arc = L.measure ? null : null;
  const ar = (function () { const RE2 = RE; return RE2; })();
}
// edges whose arc comes near P
const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
const rows = [];
for (const [id, E] of N.edges) {
  const r = RE.get(id); if (!r || !r.curve) continue;
  const ar = L.measure ? null : null;
  rows.push({ id, type: r.curve.type, sense: r.sameSense, v: r.v, t0: r.t0, t1: r.t1 });
}
const near = [];
for (const [id, E] of N.edges) {
  const r = RE.get(id); if (!r || !r.curve) continue;
  const pts = []; const c2 = r.curve;
  const n = 4000; const t0 = r.t0, t1 = r.t1;
  for (let k = 0; k <= n; k++) pts.push(L.G.curvePoint(c2, t0 + (t1 - t0) * k / n));
  let dmin = Infinity, at = null; for (const q of pts) { const d = Math.hypot(q[0] - P[0], q[1] - P[1], q[2] - P[2]); if (d < dmin) { dmin = d; at = q; } }
  near.push({ id, type: c2.type, sense: r.sameSense, t0: +r.t0.toFixed(4), t1: +r.t1.toFixed(4), dmin: +dmin.toExponential(3), at: at && at.map(x => +x.toFixed(6)) });
}
near.sort((p, q) => p.dmin - q.dmin);
console.log('edges (resolved t0/t1 arc) nearest to the display extreme:', JSON.stringify(near.slice(0, 4)));
const fl = N.faces.filter(F => F.loops.some(Lp => Lp.coedges.some(co => co.edge === near[0].id))).map(F => F.id + ':' + F.surface.type);
console.log('faces using nearest edge', fl.join(' '));
