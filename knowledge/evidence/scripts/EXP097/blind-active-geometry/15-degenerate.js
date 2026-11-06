'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const a = L.assemble(f.all, f.configs.find(x => x.N === 268).name);
const N = L.nativeModel.build(a.parsed);
const R = L.Proc.resolve(N);
const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
const RV = R.vertices instanceof Map ? R.vertices : new Map(R.vertices.map(v => [v.id, v]));
// edge samples as measure builds them
const es = new Map();
for (const [id] of N.edges) { const r = RE.get(id); const arc = L.edgeArc ? null : null; }
const planeFace = N.faces.find(F => F.surface.type === 'plane');
const fp = (function () { return null; })();
console.log('plane face', planeFace.id, 'loops', planeFace.loops.map(l => l.coedges.length));
console.log('surface', JSON.stringify(planeFace.surface).slice(0, 300));
for (const co of planeFace.loops[0].coedges.slice(0, 4)) { const E = N.edges.get(co.edge); console.log('coedge', co.edge, co.sense, 'E.v', E.v, 'E.sameSense', E.sameSense, 'curve', E.curve.type, 'pcurves', (E.pcurves || []).length); }
