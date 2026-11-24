'use strict';
/* Own geometry for the EXP113 prove check. Closed-form distances to cylinder and cone, own B-spline
 * evaluation (Cox-de Boor), own projection of a point on a curve. Only the file readers come from the converter. */
const SRC='/home/user/solidworks-converters/src';
const S=require(SRC),N=require(SRC+'/brep/native'),DJ=require(SRC+'/brep/display-join');

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const nrm=a=>Math.hypot(a[0],a[1],a[2]),dist=(a,b)=>nrm(sub(a,b));

/* signed distance to the infinite surface, closed form. Cone: the meridian plane (axial h, radial rho)
 * holds the generator rho = r + h tan(alpha); the distance to that line is (rho - r - h tan a) cos a. */
function surfDist(s,p){
  const q=sub(p,s.p),h=dot(q,s.a),rad=sub(q,mul(s.a,h)),rho=nrm(rad);
  if(s.type==='cylinder')return rho-s.r;
  if(s.type==='cone')return (rho-s.r-h*Math.tan(s.angle))*Math.cos(s.angle);
  throw Error('surfDist '+s.type);
}
/* distance to the segment a-b */
function segDist(p,a,b){const ab=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/dot(ab,ab)));return dist(p,add(a,mul(ab,t)));}

/* ---- B-spline curve, Cox-de Boor on homogeneous points ---- */
function bsEval(c,t){
  const p=c.degree,n=c.ctrl.length,K=c.knots;
  let k=p;while(k<n-1&&t>=K[k+1])k++;
  const d=[];
  for(let j=0;j<=p;j++){const i=k-p+j,w=c.weights?c.weights[i]:1;const q=c.ctrl[i];d.push([q[0]*w,q[1]*w,q[2]*w,w]);}
  for(let r=1;r<=p;r++)for(let j=p;j>=r;j--){
    const i=k-p+j,den=K[i+p-r+1]-K[i],a=den?(t-K[i])/den:0;
    for(let m=0;m<4;m++)d[j][m]=(1-a)*d[j-1][m]+a*d[j][m];}
  const h=d[p];return [h[0]/h[3],h[1]/h[3],h[2]/h[3]];
}
function bsRange(c){return [c.knots[c.degree],c.knots[c.ctrl.length]];}

/* ---- surface point from (u,v) for pcurve images (native.js stores a cone's v along the slant) ---- */
function surfPoint(s,u,v){
  if(s.type==='bspline')return bsSurf(s,u,v);
  if(s.type==='torus'){const y=cross(s.a,s.x),e=add(mul(s.x,Math.cos(u)),mul(y,Math.sin(u)));return add(s.c,add(mul(e,s.R+s.r*Math.cos(v)),mul(s.a,s.r*Math.sin(v))));}
  if(s.type==='plane'){const y=cross(s.n,s.x);return add(s.p,add(mul(s.x,u),mul(y,v)));}
  const y=cross(s.a,s.x),cu=add(mul(s.x,Math.cos(u)),mul(y,Math.sin(u)));
  if(s.type==='cylinder')return add(s.p,add(mul(cu,s.r),mul(s.a,v)));
  if(s.type==='cone'){const h=v*Math.cos(s.angle);return add(s.p,add(mul(s.a,h),mul(cu,s.r+h*Math.tan(s.angle))));}
  throw Error('surfPoint '+s.type);
}
/* ---- tensor-product B-spline surface (own): S(u,v) = sum N_i(u) N_j(v) w_ij P_ij / sum N_i N_j w_ij ---- */
function basisAt(K,p,n,t){   // returns {k, B[0..p]} for the span k with K[k] <= t < K[k+1], clamped to the valid range
  let k=p;while(k<n-1&&t>=K[k+1])k++;
  const B=new Array(p+1).fill(0);B[0]=1;const left=[],right=[];
  for(let j=1;j<=p;j++){left[j]=t-K[k+1-j];right[j]=K[k+j]-t;let saved=0;
    for(let r=0;r<j;r++){const den=right[r+1]+left[j-r];const tmp=den?B[r]/den:0;B[r]=saved+right[r+1]*tmp;saved=left[j-r]*tmp;}
    B[j]=saved;}
  return {k,B};
}
function bsSurf(s,u,v){
  const nu=s.ctrl.length,nv=s.ctrl[0].length;
  u=Math.max(s.ku[s.du],Math.min(s.ku[nu],u));v=Math.max(s.kv[s.dv],Math.min(s.kv[nv],v));
  const a=basisAt(s.ku,s.du,nu,u),b=basisAt(s.kv,s.dv,nv,v);let P=[0,0,0],W=0;
  for(let i=0;i<=s.du;i++)for(let j=0;j<=s.dv;j++){const ii=a.k-s.du+i,jj=b.k-s.dv+j,w=(s.weights?s.weights[ii][jj]:1)*a.B[i]*b.B[j],q=s.ctrl[ii][jj];
    P=[P[0]+q[0]*w,P[1]+q[1]*w,P[2]+q[2]*w];W+=w;}
  return [P[0]/W,P[1]/W,P[2]/W];
}
/* a curve is {kind, ...}; point(t) and range */
function curveFn(c){
  let t0=null,t1=null;
  if(c.type==='trimmed'){t0=c.t0;t1=c.t1;c=c.basis;}
  switch(c.type){
    case 'line':return {type:'line',c};
    case 'circle':return {type:'circle',c};
    case 'ellipse':return {type:'ellipse',c,point:t=>{const y=cross(c.n,c.x);return add(c.c,add(mul(c.x,c.r1*Math.cos(t)),mul(y,c.r2*Math.sin(t))));},range:[0,2*Math.PI]};
    case 'bspline':return {type:'bspline',c,point:t=>bsEval(c,t),range:bsRange(c)};
    case 'spcurve':{const rg=bsRange(c.c2);let r=rg;if(t0!==null&&Number.isFinite(t0)&&Number.isFinite(t1))r=[Math.max(rg[0],Math.min(t0,t1)),Math.min(rg[1],Math.max(t0,t1))];
      if(!(r[1]>r[0]))r=rg;
      return {type:'spcurve',c,point:t=>{const q=bsEval(c.c2,t);return surfPoint(c.surface,q[0],q[1]);},range:r,full:rg};}
  }
  return null;   // intersection etc: not evaluated here
}
/* distance from p to the curve: closed form for line and circle, sampling + golden section otherwise */
function curveDist(f,p){
  if(!f)return null;
  if(f.type==='line'){const c=f.c,q=sub(p,c.p);return nrm(sub(q,mul(c.d,dot(q,c.d))));}
  if(f.type==='circle'){const c=f.c,q=sub(p,c.c),h=dot(q,c.n),rho=nrm(sub(q,mul(c.n,h)));return Math.hypot(h,rho-c.r);}
  const [a,b]=f.range,M=f.type==='ellipse'?720:Math.max(400,f.c.c2?f.c.c2.ctrl.length*24:f.c.ctrl.length*24);
  const d2=t=>{const q=sub(f.point(t),p);return dot(q,q);};
  const ts=[],ds=[];let best=0;
  for(let i=0;i<=M;i++){ts.push(a+(b-a)*i/M);ds.push(d2(ts[i]));if(ds[i]<ds[best])best=i;}
  let lo=ts[Math.max(0,best-1)],hi=ts[Math.min(M,best+1)];
  const g=(Math.sqrt(5)-1)/2;let x1=hi-g*(hi-lo),x2=lo+g*(hi-lo),f1=d2(x1),f2=d2(x2);
  for(let i=0;i<120;i++){if(f1<f2){hi=x2;x2=x1;f2=f1;x1=hi-g*(hi-lo);f1=d2(x1);}else{lo=x1;x1=x2;f1=f2;x2=lo+g*(hi-lo);f2=d2(x2);}}
  return Math.sqrt(Math.min(f1,f2,ds[best]));
}

/* float32 spacing at x, metres */
function ulp32(x){x=Math.abs(x);if(x<1e-30)return 1.4e-45;const e=Math.floor(Math.log2(x));return Math.pow(2,e-23);}

const fs=require('fs'),path=require('path');
const CORPUS='/home/user/sldprt-research-dump';
/* a path, or an 8-hex id of a part in "test files online" */
function find(x){if(fs.existsSync(x))return x;const R=path.join(CORPUS,'test files online');
  for(const y of fs.readdirSync(R))if(/^\d{4}$/.test(y))for(const f of fs.readdirSync(path.join(R,y)))if(f.startsWith(x+'_'))return path.join(R,y,f);
  throw Error('no part '+x);}
function load(file){file=find(file);
  const d=S.parse(file),M=N.build(S.readBrep(file).parsed);
  const df=d.faces.filter(x=>x.metadata),j=DJ.join(df,M);
  return {d,M,df,j};
}
/* candidate 3D curves of a native face's edge with display id `id`: the edge curve, or for a tolerant edge the curve of each fin */
function edgeCurves(M,face,id,withFins){
  const out=[];
  for(const l of face.loops)for(const c of l.coedges){const e=M.edges.get(c.edge);if(e.displayId!==id)continue;
    if(!e.tolerant){const f=curveFn(e.curve);out.push({edge:e,tol:e.tolerance,name:e.curve.type==='trimmed'?'trimmed-'+e.curve.basis.type:e.curve.type,f,tolerant:false});
      // a non-tolerant edge still has fin curves on its faces; only looked at when asked for
      if(withFins)for(const pc of e.pcurves){let f=null;try{f=curveFn(pc.curve);if(f&&f.point)f.point(f.range[0]);}catch(x){f=null;}out.push({edge:e,name:'fin@'+pc.face,f,tolerant:false,extra:true});}}
    else for(const pc of e.pcurves){let f=null,err=null;try{f=curveFn(pc.curve);if(f&&f.point)f.point(f.range[0]);}catch(x){err=x.message;f=null;}
      out.push({edge:e,tol:e.tolerance,name:'tolerant-'+(pc.curve.basis?pc.curve.basis.type:pc.curve.type)+'@'+pc.face,f,tolerant:true,fin:pc.face});}}
  return out;
}
module.exports={find,S,N,DJ,sub,add,mul,dot,cross,nrm,dist,surfDist,segDist,bsEval,curveFn,curveDist,surfPoint,ulp32,load,edgeCurves};
