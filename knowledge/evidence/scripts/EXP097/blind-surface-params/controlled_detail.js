'use strict';
// Controlled parts (C13 cone, C14 sphere, C16 loft): full per-vertex numbers for the claim's
// three figures, the swap spread, the cone identity B = (P - p).a, and the sphere/BME280 join check.
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');const {makeEval}=require('./run_eval_makeEval.js');const V=O.V;
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))];};
const out={};
function load(rel){const buf=fs.readFileSync('/home/user/dump-validation/'+rel);const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  const body=partition.readBody(buf,{}).parsed;const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));return {r,nodeAt,faceNode};}
for(const [label,rel] of [['C13 cone','test files new/SW2022/C13_cone/model.SLDPRT'],['C14 sphere','test files new/SW2022/C14_sphere/model.SLDPRT'],['C16 loft','test files new/SW2022/C16_loft_spline/model.SLDPRT']]){
  const {r,nodeAt,faceNode}=load(rel);
  const faces=r.faces.filter(f=>f.metadata&&f.metadata.scalarArrays.length===2);
  const res={faces:[]};
  for(const f of faces){
    const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface),E=makeEval(sn,nodeAt,{});
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices,n=f.vertexCount;
    const e=[],es=[],ebnd=[],eint=[];const boundary=new Set();for(const ed of f.edgeAnnotations)if(ed.id!==0){boundary.add(ed.vertices[0]);boundary.add(ed.vertices[1]);}
    for(let i=0;i<n;i++){const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const d=V.norm(V.sub(E.S(A[i],B[i]),X));e.push(d);
      (boundary.has(i)?ebnd:eint).push(d);
      es.push(V.norm(V.sub(E.S(B[i],A[i]),X)));}
    res.faces.push({rawId:f.metadata.rawId,native:sn.name,verts:n,maxErr:Math.max(...e),p50:q(e,0.5),p95:q(e,0.95),
      boundaryVerts:ebnd.length,boundaryMax:Math.max(...ebnd),interiorVerts:eint.length,interiorMax:eint.length?Math.max(...eint):null,
      swapP50:q(es,0.5),swapP95:q(es,0.95),swapMax:Math.max(...es),
      swapMinMax:[Math.min(...es),Math.max(...es)]});
    if(sn.name==='CONE'){const p=sn.values.pvec,a=V.unit(sn.values.axis);let worst=0;for(let i=0;i<n;i++){const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const h=V.dot(V.sub(X,p),a);worst=Math.max(worst,Math.abs(h-B[i]));}res.coneMaxAbsBminusAxialDistance=worst;}
  }
  out[label]=res;
}
// BME280 tag-consistent sphere: is its display bounding box inside the native sphere's box?
{const {r,nodeAt,faceNode}=load('test files online/2023/03764871_BME280.SLDPRT');
 const out2=[];for(const f of r.faces){if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;const fn=faceNode.get(f.metadata.rawId);if(!fn)continue;const sn=nodeAt(fn.values.surface);
  if(sn.name!=='SPHERE')continue;const c=sn.values.centre,rad=sn.values.radius;const Vx=f.vertices;let dmin=Infinity,dmax=-Infinity;
  for(let i=0;i<f.vertexCount;i++){const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const d=V.norm(V.sub(X,c));dmin=Math.min(dmin,d);dmax=Math.max(dmax,d);}
  out2.push({rawId:f.metadata.rawId,nativeRadius:rad,vertexDistFromNativeCentre:[dmin,dmax]});}
 out.BME280SphereJoin=out2;}
fs.writeFileSync(__dirname+'/controlled_detail.out.json',JSON.stringify(out,null,1));
for(const k of Object.keys(out)){if(k==='BME280SphereJoin'){console.log(JSON.stringify(out[k]));continue;}
  for(const f of out[k].faces)console.log(k.padEnd(10),f.native,'verts',f.verts,'maxErr',f.maxErr.toExponential(3),'p50',f.p50.toExponential(2),'p95',f.p95.toExponential(2),'bnd max',f.boundaryMax.toExponential(2),'int max',f.interiorMax==null?'-':f.interiorMax.toExponential(2),'| swap p50',f.swapP50.toExponential(2),'p95',f.swapP95.toExponential(2),'max',f.swapMax.toExponential(2),out[k].coneMaxAbsBminusAxialDistance!=null?'| cone max|B-(P-p).a| '+out[k].coneMaxAbsBminusAxialDistance.toExponential(2):'');}
