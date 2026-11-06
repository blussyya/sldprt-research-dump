'use strict';
// True distance from each outlier display vertex to the native surface (closest point by grid start
// plus Newton on the two orthogonality conditions). Tells apart: (a) vertex on the surface but the
// stored (u,v) points elsewhere (parameter mismatch), (b) vertex itself off the native surface.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const O=require('./own_eval.js');const {makeEval}=require('./run_eval_makeEval.js');
const ROOT='/home/user/dump-validation';
const R=JSON.parse(fs.readFileSync(path.join(__dirname,'run_eval.out.json'),'utf8')).results;
const want=new Map();for(const x of R)if(x.status==='ok'&&x.err&&x.err.max>1e-7)want.set(x.file+'|'+x.rawId,true);
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const V=O.V;
function closest(E,X){
  const [[u0,u1],[v0,v1]]=E.domain;
  const bounded=isFinite(u0)&&isFinite(u1)&&isFinite(v0)&&isFinite(v1);
  let best={u:0,v:0,d:Infinity};
  const G=bounded?60:40;
  const ulo=bounded?u0:0,uhi=bounded?u1:2*Math.PI,vlo=bounded?v0:-1,vhi=bounded?v1:1;
  for(let a=0;a<=G;a++)for(let b=0;b<=G;b++){const u=ulo+(uhi-ulo)*a/G,v=vlo+(vhi-vlo)*b/G;const d=V.norm(V.sub(E.S(u,v),X));if(d<best.d)best={u,v,d};}
  let u=best.u,v=best.v;
  for(let it=0;it<60;it++){
    const hu=(uhi-ulo)*1e-6,hv=(vhi-vlo)*1e-6;
    const P=E.S(u,v),r=V.sub(P,X);
    const Su=V.mul(V.sub(E.S(u+hu,v),E.S(u-hu,v)),1/(2*hu)),Sv=V.mul(V.sub(E.S(u,v+hv),E.S(u,v-hv)),1/(2*hv));
    const g1=V.dot(r,Su),g2=V.dot(r,Sv);
    const a11=V.dot(Su,Su),a12=V.dot(Su,Sv),a22=V.dot(Sv,Sv),det=a11*a22-a12*a12;if(!det||!isFinite(det))break;
    const du=-(a22*g1-a12*g2)/det,dv=-(-a12*g1+a11*g2)/det;
    u=Math.min(uhi,Math.max(ulo,u+du));v=Math.min(vhi,Math.max(vlo,v+dv));
    if(Math.abs(du)+Math.abs(dv)<1e-15)break;
  }
  return {u,v,d:V.norm(V.sub(E.S(u,v),X))};
}
const rows=[];
for(const pf of scan.perFile){
  if(![...want.keys()].some(k=>k.startsWith(pf.file+'|')))continue;
  const buf=fs.readFileSync(path.join(ROOT,pf.file));
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2||!want.has(pf.file+'|'+f.metadata.rawId))continue;
    const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface),E=makeEval(sn,nodeAt,{});
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    const dists=[],paramMis=[],errs=[];
    for(let i=0;i<f.vertexCount;i++){
      const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const e=V.norm(V.sub(E.S(A[i],B[i]),X));
      if(e<=1e-7)continue;
      if(dists.length>=25)continue;   // cap: a sample of outliers per face keeps the run short
      const c=closest(E,X);dists.push(c.d);errs.push(e);
      paramMis.push(Math.hypot(c.u-A[i],c.v-B[i]));
    }
    if(!dists.length)continue;
    const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
    rows.push({file:pf.file.replace('test files ',''),rawId:f.metadata.rawId,native:sn.name,nv:f.vertexCount,outliers:dists.length,
      outlierErrMax:Math.max(...errs),trueDistMedian:med(dists),trueDistMax:Math.max(...dists),paramMismatchMedian:med(paramMis)});
  }
}
fs.writeFileSync(path.join(__dirname,'closest.out.json'),JSON.stringify(rows,null,1));
console.log(rows.length,'faces with outliers');
