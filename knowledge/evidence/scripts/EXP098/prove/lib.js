// Own box method + per-config pipeline. Does NOT use src/parasolid/select.js.
const fs=require('fs'),zlib=require('zlib');
const C='/home/user/solidworks-converters/src/';
const P=require(C+'parasolid/partition'),idx=require(C+'index'),G=require(C+'geom/eval');
const Native=require(C+'brep/native'),Proc=require(C+'brep/procedural'),Split=require(C+'brep/split'),SE=require(C+'step/export');
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:128<<20}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:128<<20})};
const TAU=2*Math.PI;
const mn=()=>[Infinity,Infinity,Infinity],mx=()=>[-Infinity,-Infinity,-Infinity];
function grow(B,p){for(let k=0;k<3;k++){if(p[k]<B.min[k])B.min[k]=p[k];if(p[k]>B.max[k])B.max[k]=p[k];}}
function inArc(t,t0,t1){ // t in arc from t0 to t1 (either direction), modulo 2pi
  const lo=Math.min(t0,t1),hi=Math.max(t0,t1);if(hi-lo>=TAU-1e-12)return true;
  let d=((t-lo)%TAU+TAU)%TAU;return d<=hi-lo+1e-12;}
// box of a resolved+split model M (vertices, edges, faces), own method:
// vertices + dense samples with golden-section refinement of each axis extreme + analytic ellipse/circle extremes
function boxOf(M,NS=1500){
  const B={min:mn(),max:mx()};
  for(const v of M.vertices.values())grow(B,v.p);
  for(const e of M.edges.values()){
    const c=e.curve,t0=e.t0,t1=e.t1;
    if(c.type==='line'){ // endpoints
      grow(B,G.curvePoint(c,t0));grow(B,G.curvePoint(c,t1));continue;}
    const f=t=>G.curvePoint(c,t);
    const ts=[];for(let i=0;i<=NS;i++)ts.push(t0+(t1-t0)*i/NS);
    const pts=ts.map(f);for(const p of pts)grow(B,p);
    for(let k=0;k<3;k++)for(const sg of [1,-1]){
      let bi=0,bv=-Infinity;pts.forEach((p,i)=>{if(sg*p[k]>bv){bv=sg*p[k];bi=i;}});
      let a=ts[Math.max(0,bi-1)],b=ts[Math.min(NS,bi+1)];
      for(let it=0;it<80;it++){const m1=a+(b-a)/3,m2=b-(b-a)/3;if(sg*f(m1)[k]<sg*f(m2)[k])a=m1;else b=m2;}
      grow(B,f((a+b)/2));
    }
    if(c.type==='circle'||c.type==='ellipse'){
      const r1=c.r1||c.r,r2=c.r2||c.r,x=G.unit?G.unit(c.x):c.x;
      const y=G.cross(c.n,c.x);const ny=Math.hypot(...y),nx=Math.hypot(...c.x);
      for(let k=0;k<3;k++){const t=Math.atan2(r2*y[k]/ny,r1*c.x[k]/nx);
        for(const tt of [t,t+Math.PI]){const tn=((tt%TAU)+TAU)%TAU;
          // arc test with t0..t1 (parameters of the same circle)
          if(inArc(tn,t0,t1)||inArc(tn+TAU,t0,t1))grow(B,f(tn));}}
    }
  }
  return B;
}
function union(faces){const B={min:mn(),max:mx()};let miss=0;for(const f of faces){if(!f.bounds){miss++;continue;}grow(B,f.bounds.min);grow(B,f.bounds.max);}return {...B,missing:miss};}
function gap(A,B){let g=0;for(let k=0;k<3;k++){g=Math.max(g,Math.abs(A.min[k]-B.min[k]),Math.abs(A.max[k]-B.max[k]));}return g;}
function configs(raw){const all=P.streams(raw,codec);return {all,names:Object.keys(all).filter(k=>/Config-\d+-Partition$/.test(k)).sort((a,b)=>+a.match(/\d+/)[0]-+b.match(/\d+/)[0])};}
// pipeline for one config: returns {nativeFaces, faces, box, stepText}
function build(all,name,wantStep){
  const a=P.assemble(all,name,codec,{});
  if(a.parsed.error)throw Error('parse: '+a.parsed.error);
  const N=Native.build(a.parsed);
  const R=Proc.resolve(N,{});const M=Split.split(R);
  const out={name,nativeFaces:N.faces.length,faces:M.faces.length,box:boxOf(R),nanVerts:[...M.vertices.values()].filter(v=>!v.p.every(Number.isFinite)).length};
  if(wantStep)out.step=SE.fromNative(N,{}).text;
  return out;
}
module.exports={P,idx,G,codec,boxOf,union,gap,configs,build,SE,Native};
