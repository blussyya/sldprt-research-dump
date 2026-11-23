'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const c = f.configs.find(x => x.N === 268);
const a = L.assemble(f.all, c.name);
const N = L.nativeModel.build(a.parsed);
const R = L.Proc.resolve(N);
const RE = R.edges instanceof Map ? R.edges : new Map(R.edges.map(e => [e.id, e]));
const low = [...N.vertices.values()].sort((p, q) => p.p[1] - q.p[1])[0];
console.log('lowest vertex', low.id, low.p);
const edgesV = [...N.edges.values()].filter(e => e.v && (e.v[0] === low.id || e.v[1] === low.id));
console.log('edges at vertex', edgesV.map(e => ({ id: e.id, v: e.v, sense: e.sameSense, curve: e.curve && e.curve.type, RE: RE.get(e.id) ? { t0: RE.get(e.id).t0, t1: RE.get(e.id).t1, sense: RE.get(e.id).sameSense, c: RE.get(e.id).curve.type } : null })));
const facesAt = N.faces.filter(F => F.loops.some(Lp => Lp.coedges.some(co => edgesV.some(e => e.id === co.edge))));
console.log('faces using those edges', facesAt.map(F => F.id + ':' + F.surface.type).join(' '));
for (const F of facesAt) {
  const Pt = F.loops.flatMap(Lp => Lp.coedges).filter(co => edgesV.some(e => e.id === co.edge));
  console.log('face', F.id, F.surface.type, JSON.stringify(F.surface).slice(0, 300));
}
const e0 = edgesV[0];
if (e0) { const r = RE.get(e0.id); const pts = []; for (let k = 0; k <= 8; k++) pts.push(L.G.curvePoint(r.curve, r.t0 + (r.t1 - r.t0) * k / 8).map(x => +x.toFixed(5))); console.log('edge', e0.id, 'curve', JSON.stringify(r.curve).slice(0, 300)); console.log('samples', JSON.stringify(pts)); }
