'use strict';
// Config 268 of 118a3cb0: the four single-vertex loop points. Are they display vertices? What is the union without them?
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const a = L.assemble(f.all, f.configs.find(x => x.N === 268).name);
const N = L.nativeModel.build(a.parsed);
const lone = [];
for (const F of N.faces) for (const Lp of F.loops) if (!Lp.coedges.length && Lp.vertex != null) lone.push({ face: F.id, p: N.vertices.get(Lp.vertex).p });
const disp = []; for (const df of f.displayFaces) for (let i = 0; i < df.verts.length; i += 3) disp.push([df.verts[i], df.verts[i + 1], df.verts[i + 2]]);
const res = lone.map(x => { let d = Infinity; for (const q of disp) d = Math.min(d, Math.hypot(q[0] - x.p[0], q[1] - x.p[1], q[2] - x.p[2])); return { face: x.face, p: x.p.map(v => +v.toFixed(6)), nearestDisplayVertex_m: +d.toExponential(2) }; });
console.log('lone-loop points', JSON.stringify(res));
// union with and without the lone points (edges and faces otherwise identical)
const m = L.measure(a.parsed, { grid: 60 });
const withLone = L.boxDiff(m.fullBox, f.displayUnion);
const minY = Math.min(...m.faces.filter(x => x.acc.n).map(x => x.acc.min[1]));
console.log('union gap with lone points (m):', withLone, 'lowest face y with them:', minY);
const withoutMinY = Math.min(...lone.length ? m.faces.map(x => x.acc.min[1]) : [0]);
