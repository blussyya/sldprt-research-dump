'use strict';
// Own closed-form point-to-surface distances (metres). Written for EXP-105 prove; does not use residual() from display-join.
const S=require('/home/user/solidworks-converters/src');
const nat=require('/home/user/solidworks-converters/src/brep/native');
const J=require('/home/user/solidworks-converters/src/brep/display-join');

const unit=v=>{const n=Math.hypot(v[0],v[1],v[2]);return [v[0]/n,v[1]/n,v[2]/n];};

// Unsigned distance from q to the infinite circular cylinder (axis through p along a, radius r).
function distCylinder(q,p,a,r){
  a=unit(a);
  const w=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],t=w[0]*a[0]+w[1]*a[1]+w[2]*a[2];
  const rho=Math.hypot(w[0]-t*a[0],w[1]-t*a[1],w[2]-t*a[2]);
  return Math.abs(rho-r);
}
// Unsigned distance from q to a cone nappe. Native convention (checked on C13): radius at axial height h
// (h measured from p along a) is r + h*tan(alpha). Euclidean distance in the meridian plane to the generator
// ray from the apex; if the foot lies behind the apex the distance is to the apex.
function distCone(q,p,a,r,alpha){
  a=unit(a);
  const w=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],h=w[0]*a[0]+w[1]*a[1]+w[2]*a[2];
  const rho=Math.hypot(w[0]-h*a[0],w[1]-h*a[1],w[2]-h*a[2]);
  const ta=Math.tan(alpha),h0=-r/ta;             // apex height
  let u0=Math.sin(alpha),u1=Math.cos(alpha);     // generator direction in (rho,h)
  if((0-h0)/u1<0){u0=-u0;u1=-u1;}                // choose the nappe that contains (r,0)
  const s=rho*u0+(h-h0)*u1;                      // coordinate along generator from apex
  if(s<0)return Math.hypot(rho,h-h0);
  return Math.abs(rho*u1-(h-h0)*u0);
}
function distFace(surf,q){
  if(surf.type==='cylinder')return distCylinder(q,surf.p,surf.a,surf.r);
  if(surf.type==='cone')return distCone(q,surf.p,surf.a,surf.r,surf.angle);
  return null;
}
// distance from point q to segment [a,b]
function distSegment(q,a,b){
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[q[0]-a[0],q[1]-a[1],q[2]-a[2]];
  const L2=d[0]*d[0]+d[1]*d[1]+d[2]*d[2];if(L2===0)return Math.hypot(...w);
  let t=(w[0]*d[0]+w[1]*d[1]+w[2]*d[2])/L2;t=Math.max(0,Math.min(1,t));
  return Math.hypot(w[0]-t*d[0],w[1]-t*d[1],w[2]-t*d[2]);
}
// half an ulp of a float32 value, as an upper bound on its storage rounding error
const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer);
function halfUlp32(x){f32[0]=x;const e=(u32[0]>>>23)&255;return e===0?2**-150:2**(e-127-23-1);}
function slack32(q){return Math.hypot(halfUlp32(q[0]),halfUlp32(q[1]),halfUlp32(q[2]));}

function load(file){
  const d=S.parse(file);
  const M=nat.build(S.readBrep(file).parsed);
  const j=J.join(d.faces,M);
  return {d,M,j};
}
module.exports={distCylinder,distCone,distFace,distSegment,slack32,load,unit};
