'use strict';
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');
for(const rel of ['test files online/2018/15567d51_leva1.SLDPRT','test files original/Dekor.SLDPRT']){
  const buf=fs.readFileSync('/home/user/dump-validation/'+rel);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const sw=body.nodes.filter(n=>n.name==='SWEPT_SURF').slice(0,3);
  for(const s of sw){const sec=nodeAt(s.values.section);
    const nc=sec.name==='B_CURVE'?nodeAt(sec.values.nurbs):sec;
    const v=nc.values;
    const k=O.expandKnots(nodeAt(v.knot_mult).values.mult,nodeAt(v.knots).values.knots);
    console.log(rel.slice(-22),'swept',s.index,'section',sec.name,'->',nc.name,'deg',v.degree,'nverts',v.n_vertices,'knots',k.length,'domain',k[v.degree],k[v.n_vertices],'sweep',JSON.stringify(s.values.sweep),'scale',s.values.scale);}
  const faces=r.faces.filter(f=>f.metadata&&f.metadata.scalarArrays.length===2).slice(0,2);
  for(const f of faces){const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values;
    console.log('  array face rawId',f.metadata.rawId,'A range',Math.min(...A),Math.max(...A),'B range',Math.min(...B),Math.max(...B));}
}
