'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const c = f.configs.find(x => x.N === 268);
const P = L.assemble(f.all, c.name).parsed;
const byIdx = new Map(P.nodes.map(n => [n.index, n]));
const vtx = P.nodes.filter(n => n.type === 18);
const usedIdx = new Set();
for (const n of P.nodes) for (const p of (n.pointers || [])) usedIdx.add(p.target);
const orphanNodes = vtx.filter(v => !P.nodes.some(n => n.type === 16 && false));
// vertex nodes referenced by any pointer
const refd = vtx.map(v => ({ v, refs: P.nodes.filter(n => (n.pointers || []).some(p => p.target === v.index)).map(n => ({ type: n.type, index: n.index, field: (n.pointers || []).find(p => p.target === v.index).field })) }));
const low = refd.filter(r => Math.abs(r.v.values.pvec ? 0 : 0) === 0).slice(0, 0);
const cand = refd.filter(r => r.refs.length === 0 || r.refs.every(x => x.type === 18));
console.log('vertex nodes', vtx.length, 'with no referencing node', refd.filter(r => r.refs.length === 0).length);
const nodeOfPoint = n => { const pn = byIdx.get(n.values.point); return pn ? pn.values.pvec : null; };
for (const r of refd.filter(r => { const p = nodeOfPoint(r.v); return p && p[1] < -0.0559; })) {
  console.log('vertex', r.v.index, 'node_id', r.v.values.node_id, 'point', nodeOfPoint(r.v), 'refs', JSON.stringify(r.refs.slice(0, 6)));
}
