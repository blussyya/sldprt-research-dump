'use strict';
// leva1: the section is closed and periodic on [0,1] but stored u runs to 2. Test u wrapped into the
// period, u - floor(u), against the vertices.
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');const V=O.V;
const rel='test files online/2018/15567d51_leva1.SLDPRT';
const buf=fs.readFileSync('/home/user/dump-validation/'+rel);
const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);const body=partition.readBody(buf,{}).parsed;
const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
const f=r.faces.find(x=>x.metadata&&x.metadata.scalarArrays.length===2);
const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface);
const E=O.sweptEval(sn,nodeAt,'unit');
const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
const errs=[],errsRaw=[];
for(let i=0;i<f.vertexCount;i++){const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];
  const uw=A[i]-Math.floor(A[i]);errs.push(V.norm(V.sub(E.S(uw,B[i]),X)));}
errs.sort((a,b)=>a-b);
console.log(JSON.stringify({file:rel,verts:f.vertexCount,wrapErrMax:errs[errs.length-1],wrapErrP50:errs[Math.floor(errs.length/2)],wrapErrP95:errs[Math.floor(0.95*errs.length)],uRange:[Math.min(...A),Math.max(...A)],vRange:[Math.min(...B),Math.max(...B)],scale:sn.values.scale},null,1));
