'use strict';
// Why do swept vertices fail to evaluate? For each NaN vertex: is its stored u inside the section
// knot domain (with the same tolerance the evaluator uses)? Also the v value.
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');
const rows=[];
for(const rel of ['test files online/2018/15567d51_leva1.SLDPRT','test files original/Dekor.SLDPRT']){
  const buf=fs.readFileSync('/home/user/dump-validation/'+rel);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  let nanIn=0,nanOut=0,nanOther=0,total=0;const ex=[];
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const fn=faceNode.get(f.metadata.rawId);const sn=fn&&nodeAt(fn.values.surface);if(!sn||sn.name!=='SWEPT_SURF')continue;
    const sec=nodeAt(sn.values.section);const nc=nodeAt(sec.values.nurbs);const v=nc.values;
    const k=O.expandKnots(nodeAt(v.knot_mult).values.mult,nodeAt(v.knots).values.knots);const dom=[k[v.degree],k[v.n_vertices]];
    const E=O.sweptEval(sn,nodeAt,'unit');const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    for(let i=0;i<f.vertexCount;i++){total++;const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const e=O.V.norm(O.V.sub(E.S(A[i],B[i]),X));
      if(Number.isFinite(e))continue;
      const inside=A[i]>=dom[0]-1e-9&&A[i]<=dom[1]+1e-9;
      if(inside)nanIn++;else nanOut++;
      if(ex.length<4)ex.push({u:A[i],v:B[i],dom,inside,c_u_is_finite:Number.isFinite(E.S(A[i],0)[0])});
    }
  }
  rows.push({file:rel,totalVerts:total,nanUOutsideDomain:nanOut,nanUInsideDomain:nanIn,examples:ex});
}
console.log(JSON.stringify(rows,null,1));
