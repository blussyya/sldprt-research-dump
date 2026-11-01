const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval');
const file=require('child_process').execSync("ls '/home/user/sldprt-research-dump/test files online/'*/82981f2a_head_back.sldprt").toString().trim();
const M=N.build(S.readBrep(file).parsed);
const f=M.faces.find(x=>x.id===2478), b=f.surface;
const off=b.spine.surfaces[0], pl=b.spine.surfaces[1];
const [[u0,u1],[v0,v1]]=G.surfaceRange(off);
const nrm=pl.n, pp=pl.p;
const dotv=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const planeD=p=>dotv(nrm,[p[0]-pp[0],p[1]-pp[1],p[2]-pp[2]]);
// solve on offset surface: plane=0, p.x=x0 (axis ax)
function solve(x0,u,v,ax=0){
  for(let it=0;it<60;it++){
    const e=G.surfaceEval(off,u,v);
    const F=[planeD(e.p),e.p[ax]-x0];
    if(Math.abs(F[0])<3e-13&&Math.abs(F[1])<3e-13)return {u,v,p:e.p};
    const J=[[dotv(nrm,e.du),dotv(nrm,e.dv)],[e.du[ax],e.dv[ax]]];
    const det=J[0][0]*J[1][1]-J[0][1]*J[1][0]; if(Math.abs(det)<1e-18)return null;
    let du=-(J[1][1]*F[0]-J[0][1]*F[1])/det, dv=-(-J[1][0]*F[0]+J[0][0]*F[1])/det;
    const s=Math.max(1,Math.hypot(du,dv)/((u1-u0)/20)); du/=s;dv/=s;
    u+=du;v+=dv;
    if(Math.abs(u)>1e4||Math.abs(v)>1e4)return null;
    if(Math.hypot(du,dv)<1e-15*(1+Math.abs(u)+Math.abs(v)))break;
  }
  const e=G.surfaceEval(off,u,v);
  if(Math.abs(planeD(e.p))>5e-12||Math.abs(e.p[ax]-x0)>5e-12)return null;
  return {u,v,p:e.p};
}
function all(x0,n=40,ax=0){
  const out=[];
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
    const r=solve(x0,u0+(u1-u0)*i/n,v0+(v1-v0)*j/n,ax); if(!r)continue;
    if(!out.some(o=>Math.hypot(o.p[0]-r.p[0],o.p[1]-r.p[1],o.p[2]-r.p[2])<1e-9))out.push(r);
  }
  return out;
}
module.exports={M,G,off,pl,b,u0,u1,v0,v1,solve,all,planeD,F:require(R+'/src/brep/fit'),R};
