'use strict';
// Per-face detail for the control and claim tags, to find why cylinder residuals are far above zero.
const C = '/home/user/conv-dev/src';
const display = require(C), native = require(C + '/brep/native'), E = require(C + '/geom/eval');
const path = process.argv[2], tagsWanted = (process.argv[3] || '4002,4003,4010,4008').split(',').map(Number);
const d = display.parse(path);
const b = native.build(require(C + '/index').readBrep(path).parsed);
const byId = new Map(); for (const nf of b.faces) { if (!byId.has(nf.id)) byId.set(nf.id, []); byId.get(nf.id).push(nf); }
const rows = [];
for (const f of d.faces) {
  const m = f.metadata; if (!tagsWanted.includes(m.typeTag)) continue;
  const nf = (byId.get(m.rawId) || [])[0]; if (!nf) { rows.push({raw: m.rawId, tag: m.typeTag, note: 'unjoined'}); continue; }
  const s = nf.surface, ds = []; const n = f.vertexCount, st = Math.max(1, Math.floor(n / 80));
  const pts = [];
  for (let i = 0; i < n; i += st) { const p = [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]]; pts.push(p);
    try { ds.push(Math.abs(E.surfaceDistance(s, p).d)); } catch (e) { ds.push(NaN); } }
  const mx = Math.max(...ds.filter(Number.isFinite)); const bb = [0,1,2].map(k => [Math.min(...pts.map(p=>p[k])), Math.max(...pts.map(p=>p[k]))]);
  rows.push({raw: m.rawId, tag: m.typeTag, nat: s.type, nodeId: nf.id, verts: n, maxDist: +mx.toExponential(3),
    dirDotAxis: s.a ? +(m.direction.reduce((acc,x,k)=>acc+x*s.a[k],0)).toFixed(4) : null,
    radius: s.r !== undefined ? +s.r.toFixed(6) : null, bbox: bb.map(([a,b2]) => [+a.toFixed(4), +b2.toFixed(4)]), params: m.parameters.map(x=>+x.toFixed(5))});
}
rows.sort((a,b)=>(a.tag-b.tag)||(b.maxDist-a.maxDist));
const per={};for(const r of rows){per[r.tag]=per[r.tag]||[];if(per[r.tag].length<5)per[r.tag].push(r);}console.log(JSON.stringify(per));
console.log('count', rows.length, 'over 1e-8:', rows.filter(r=>r.maxDist>1e-8).length);
