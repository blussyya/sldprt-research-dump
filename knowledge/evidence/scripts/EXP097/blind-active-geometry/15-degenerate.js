'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const a = L.assemble(f.all, f.configs.find(x => x.N === 268).name);
const N = L.nativeModel.build(a.parsed);
const R = L.Proc.resolve(N);
const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
const RV = R.vertices instanceof Map ? R.vertices : new Map(R.vertices.map(v => [v.id, v]));
const edgeSamples = new Map();
for (const [id] of N.edges) { const r = RE.get(id); const arc = L.edgeArc(r, RV); edgeSamples.set(id, { pts: L.sampleArc(arc, RV, r), arc }); }
const F = N.faces.find(x => x.id === 196);
const fp = L.facePolygons(F, N, edgeSamples);
console.log('notes', fp.notes, 'polys', fp.polys.map(p => p && { n: p.pts.length, area: p.area, bb: p.bb.map(x => +x.toFixed(6)), first: p.pts.slice(0, 4).map(q => q.map(x => +x.toFixed(6))) }));
