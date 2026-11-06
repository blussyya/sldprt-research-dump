'use strict';
// Two follow-ups on swept faces with stored u outside the section domain.
// (a) Dekor: stored u is float32 and a few ulps past the float64 domain end. Clamp u into the domain
//     when within 2 float32 ulps of an end; see whether the points then match.
// (b) leva1: stored u runs to 2 on a section with domain [0,1]. Is the section closed or periodic
//     (so that u and u-1 give the same point)? If not, the stored u is not on this curve.
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');const V=O.V;
const ulp32=x=>Math.pow(2,Math.floor(Math.log2(Math.abs(x)))-23);
const out={};
for(const rel of ['test files original/Dekor.SLDPRT','test files online/2018/15567d51_leva1.SLDPRT']){
  const buf=fs.readFileSync('/home/user/dump-validation/'+rel);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  let fixed=0,stillNaN=0,total=0,maxFixedErr=0;const sample=[];
  let closedInfo=null;
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const fn=faceNode.get(f.metadata.rawId);const sn=fn&&nodeAt(fn.values.surface);if(!sn||sn.name!=='SWEPT_SURF')continue;
    const sec=nodeAt(sn.values.section);const nc=nodeAt(sec.values.nurbs);const v=nc.values;
    const k=O.expandKnots(nodeAt(v.knot_mult).values.mult,nodeAt(v.knots).values.knots);const dom=[k[v.degree],k[v.n_vertices]];
    const curve=O.nurbsCurveEval(nc,nodeAt);
    if(!closedInfo){const p0=curve.S(dom[0]),p1=curve.S(dom[1]);closedInfo={closedEnds:V.norm(V.sub(p0,p1)),periodic:!!v.periodic,closed:!!v.closed,domain:dom};}
    const E=O.sweptEval(sn,nodeAt,'unit');const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    for(let i=0;i<f.vertexCount;i++){total++;const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];
      let u=A[i];
      const e0=V.norm(V.sub(E.S(u,B[i]),X));if(Number.isFinite(e0))continue;
      const tol=2*ulp32(Math.max(Math.abs(dom[0]),Math.abs(dom[1])));
      if(u<dom[0]&&dom[0]-u<=tol)u=dom[0];else if(u>dom[1]&&u-dom[1]<=tol)u=dom[1];
      const e=V.norm(V.sub(E.S(u,B[i]),X));
      if(Number.isFinite(e)){fixed++;maxFixedErr=Math.max(maxFixedErr,e);}else{stillNaN++;if(sample.length<3)sample.push({u:A[i],dom});}
    }
  }
  out[rel]={totalVerts:total,nanBeforeClampFixed:fixed,nanStillAfterClamp:stillNaN,maxErrAfterClampOnFixed:maxFixedErr,curve:closedInfo,stillNaNExamples:sample};
}
fs.writeFileSync(__dirname+'/swept_tests.out.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
