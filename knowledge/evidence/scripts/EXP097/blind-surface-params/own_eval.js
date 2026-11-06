'use strict';
// Independent surface evaluators written for EXP-097. Nothing here imports src/geom/eval.js or
// src/brep/*. Inputs are raw Parasolid node values (from src/parasolid/partition.readBody, which
// only parses the bytes) and plain arrays. All lengths in metres.
const V={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  norm:a=>Math.hypot(a[0],a[1],a[2]),
  unit:a=>{const m=Math.hypot(a[0],a[1],a[2]);return [a[0]/m,a[1]/m,a[2]/m];},
};

// ---- closed forms for the analytic surfaces (Parasolid conventions as read from the node fields) ----
// Frame: a = unit axis, x = unit x_axis, y = a x x (right-handed, the convention every corpus sample
// was checked against in inspect_one.js). Returned residuals report how far x is from perpendicular.
function frame(axis,xAxis){const a=V.unit(axis),x=V.unit(xAxis),y=V.cross(a,x);return {a,x,y,perp:Math.abs(V.dot(a,x))};}

function planeEval(n){ // P(u,v) = p + u x + v y, y = n x x
  const p=n.values.pvec,nn=V.unit(n.values.normal),x=V.unit(n.values.x_axis),y=V.cross(nn,x);
  return {name:'PLANE',perp:Math.abs(V.dot(nn,x)),domain:[[-Infinity,Infinity],[-Infinity,Infinity]],
    S:(u,v)=>V.add(p,V.add(V.mul(x,u),V.mul(y,v)))};
}
function cylinderEval(n){ // P(u,v) = p + r (cos u x + sin u y) + v a
  const f=frame(n.values.axis,n.values.x_axis),p=n.values.pvec,r=n.values.radius;
  return {name:'CYLINDER',perp:f.perp,domain:[[0,2*Math.PI],[-Infinity,Infinity]],
    S:(u,v)=>V.add(p,V.add(V.mul(V.add(V.mul(f.x,Math.cos(u)),V.mul(f.y,Math.sin(u))),r),V.mul(f.a,v)))};
}
function coneEval(n){ // P(u,v) = p + (r + v t)(cos u x + sin u y) + v a, t = sin/cos of the half angle
  const f=frame(n.values.axis,n.values.x_axis),p=n.values.pvec,r=n.values.radius,t=n.values.sin_half_angle/n.values.cos_half_angle;
  return {name:'CONE',perp:f.perp,domain:[[0,2*Math.PI],[-Infinity,Infinity]],
    S:(u,v)=>V.add(p,V.add(V.mul(V.add(V.mul(f.x,Math.cos(u)),V.mul(f.y,Math.sin(u))),r+v*t),V.mul(f.a,v)))};
}
function sphereEval(n){ // P(u,v) = c + r (cos v (cos u x + sin u y) + sin v a); u longitude, v latitude
  const f=frame(n.values.axis,n.values.x_axis),c=n.values.centre,r=n.values.radius;
  return {name:'SPHERE',perp:f.perp,domain:[[0,2*Math.PI],[-Math.PI/2,Math.PI/2]],
    S:(u,v)=>{const ring=V.add(V.mul(f.x,Math.cos(u)),V.mul(f.y,Math.sin(u)));
      return V.add(c,V.mul(V.add(V.mul(ring,Math.cos(v)),V.mul(f.a,Math.sin(v))),r));}};
}

// ---- B-splines, Cox-de Boor written out here ----
function expandKnots(mult,kn){const out=[];mult.forEach((m,i)=>{for(let j=0;j<m;j++)out.push(kn[i]);});return out;}
// Nonzero-or-zero basis N_{i,p}(t), i = 0..n-1, for knot vector k (length n+p+1). The domain is
// [k[p], k[n]]; the right end is included in the last non-degenerate span.
function basisAll(k,p,n,t){
  const tEnd=k[n];
  const N0=(i)=>{const lo=k[i],hi=k[i+1];if(lo<hi&&((lo<=t&&t<hi)||(t===tEnd&&hi===tEnd)))return 1;return 0;};
  let row=[];for(let i=0;i<n+p;i++)row.push(N0(i));
  for(let d=1;d<=p;d++){const next=[];
    for(let i=0;i<n+p-d;i++){let s=0;const d1=k[i+d]-k[i];if(d1>0)s+=(t-k[i])/d1*row[i];
      const d2=k[i+d+1]-k[i+1];if(d2>0)s+=(k[i+d+1]-t)/d2*row[i+1];next.push(s);}
    row=next;}
  return row.slice(0,n);
}
function nurbsSurfaceEval(node,nodeAt,order='vfast'){
  const v=node.values,nu=v.n_u_vertices,nv=v.n_v_vertices,pu=v.u_degree,pv=v.v_degree,dim=v.vertex_dim,rational=!!v.rational;
  const flat=nodeAt(v.bspline_vertices).values.vertices,ku=expandKnots(nodeAt(v.u_knot_mult).values.mult,nodeAt(v.u_knots).values.knots),kv=expandKnots(nodeAt(v.v_knot_mult).values.mult,nodeAt(v.v_knots).values.knots);
  if(ku.length!==nu+pu+1||kv.length!==nv+pv+1)throw Error('knot count mismatch');
  if(flat.length!==nu*nv*dim)throw Error('control count mismatch');
  const Q=(a,b)=>{const idx=order==='vfast'?(a*nv+b):(b*nu+a);const q=flat.slice(idx*dim,idx*dim+dim);
    if(rational){const w=q[dim-1];return {p:[q[0]/w,q[1]/w,q[2]/w],w};}return {p:q.slice(0,3),w:1};};
  return {name:'B_SURFACE',domain:[[ku[pu],ku[nu]],[kv[pv],kv[nv]]],
    S:(u,vv)=>{const Nu=basisAll(ku,pu,nu,u),Nv=basisAll(kv,pv,nv,vv);let P=[0,0,0],W=0;
      for(let a=0;a<nu;a++)for(let b=0;b<nv;b++){const f=Nu[a]*Nv[b];if(!f)continue;const q=Q(a,b),g=f*q.w;P=V.add(P,V.mul(q.p,g));W+=g;}
      return V.mul(P,1/W);}};
}
function nurbsCurveEval(node,nodeAt){
  const v=node.values,n=v.n_vertices,p=v.degree,dim=v.vertex_dim,rational=!!v.rational;
  const flat=nodeAt(v.bspline_vertices).values.vertices,k=expandKnots(nodeAt(v.knot_mult).values.mult,nodeAt(v.knots).values.knots);
  if(k.length!==n+p+1)throw Error('curve knot count mismatch');
  return {domain:[k[p],k[n]],S:(t)=>{const N=basisAll(k,p,n,t);let P=[0,0,0],W=0;
    for(let i=0;i<n;i++){if(!N[i])continue;const q=flat.slice(i*dim,i*dim+dim),w=rational?q[dim-1]:1;
      const c=rational?[q[0]/w,q[1]/w,q[2]/w]:q.slice(0,3);P=V.add(P,V.mul(c,N[i]*w));W+=N[i]*w;}
    return V.mul(P,1/W);}};
}
// SWEPT_SURF: P(u,v) = c(u) + s * v * d, d = unit sweep vector. s = 1 (the converter's reading) or
// s = scale (the alternative this file tests). Section must be a B_CURVE.
function sweptEval(node,nodeAt,sMode){
  const sec=nodeAt(node.values.section);if(sec.name!=='B_CURVE')throw Error('swept section '+sec.name);
  const c=nurbsCurveEval(nodeAt(sec.values.nurbs),nodeAt),d=V.unit(node.values.sweep),scale=node.values.scale;
  const s=sMode==='scale'?scale:1;
  return {name:'SWEPT_SURF',domain:[c.domain,[-Infinity,Infinity]],S:(u,v)=>V.add(c.S(u),V.mul(d,s*v))};
}
module.exports={V,planeEval,cylinderEval,coneEval,sphereEval,nurbsSurfaceEval,nurbsCurveEval,sweptEval,basisAll,expandKnots};
