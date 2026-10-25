'use strict';
/* Parasolid rolling-ball blends (BLENDED_EDGE, node type 56) as B-spline surfaces.
 *
 * Measured on the corpus (EXP-078): the blend face is swept by a ball of radius |range| whose
 * centre runs along `spine`. At each spine point c the ball touches each support at the support's
 * point nearest c; the face is the shorter circular arc between those two contacts, in the plane
 * through c that holds both. Every display-mesh vertex of Pocket Wheel's 32 blend faces is 8 mm
 * (= |range|) from the spine ellipse. A support may itself be a blend of radius 0, which is just
 * its spine curve (a sharp edge the ball rolls along), as in USB hub TOP.
 *
 * STEP has no rolling-ball surface, so the blend is written as a bicubic B-spline interpolating
 * the exact surface on a grid, refined until it is within `tol` of the exact surface at every
 * cell centre.
 *
 *   blendSurface({spine, supports, t0, t1}, {tol}) -> neutral bspline surface
 *     spine:    neutral curve (centre path), parameter t in [t0, t1]
 *     supports: two objects with foot(c) -> nearest point to c
 * u runs along the spine, v from the contact on supports[0] to the contact on supports[1].
 */
const G=require('../geom/eval');

function section(spine,supports,t){
  const c=G.curvePoint(spine,t),p0=supports[0].foot(c),p1=supports[1].foot(c);
  const a=G.sub(p0,c),R=G.norm(a),e1=G.mul(a,1/R),b=G.sub(p1,c),e2=G.unit(G.sub(b,G.mul(e1,G.dot(b,e1))));
  const theta=Math.atan2(G.dot(b,e2),G.dot(b,e1));
  return {c,R,e1,e2,theta,at:s=>G.add(c,G.add(G.mul(e1,R*Math.cos(s*theta)),G.mul(e2,R*Math.sin(s*theta))))};
}

/* Global cubic interpolation (The NURBS Book A9.1) with given parameters; returns control points
 * and the knot vector. pts: array of points (any dimension, as arrays). */
function interpolate(params,pts){
  const n=pts.length,p=Math.min(3,n-1),knots=[];
  for(let i=0;i<=p;i++)knots.push(params[0]);
  for(let j=1;j<n-p;j++){let s=0;for(let i=j;i<j+p;i++)s+=params[i];knots.push(s/p);}
  for(let i=0;i<=p;i++)knots.push(params[n-1]);
  const A=params.map(t=>{const k=G.span(knots,p,n,t),B=G.basisFuns(knots,p,k,t),row=new Array(n).fill(0);for(let j=0;j<=p;j++)row[k-p+j]=B[j];return row;});
  const dim=pts[0].length,X=pts.map(q=>q.slice());
  for(let col=0;col<n;col++){   // Gaussian elimination with partial pivoting
    let piv=col;for(let r=col+1;r<n;r++)if(Math.abs(A[r][col])>Math.abs(A[piv][col]))piv=r;
    [A[col],A[piv]]=[A[piv],A[col]];[X[col],X[piv]]=[X[piv],X[col]];
    for(let r=0;r<n;r++){if(r===col||!A[r][col])continue;const f=A[r][col]/A[col][col];
      for(let k=col;k<n;k++)A[r][k]-=f*A[col][k];for(let d=0;d<dim;d++)X[r][d]-=f*X[col][d];}
  }
  return {ctrl:X.map((x,i)=>x.map(v=>v/A[i][i])),knots,degree:p};
}

function blendSurface({spine,supports,t0,t1},{tol=1e-8,nu=8,nv=6,maxN=512}={}){
  const exact=(u,v)=>section(spine,supports,u).at(v);
  for(;;){
    const us=Array.from({length:nu+1},(_,i)=>t0+(t1-t0)*i/nu),vs=Array.from({length:nv+1},(_,j)=>j/nv);
    const grid=us.map(u=>{const sct=section(spine,supports,u);return vs.map(v=>sct.at(v));});
    // interpolate along v for each u, then along u for each v-control column
    const rows=grid.map(r=>interpolate(vs,r)),kv=rows[0].knots;
    const cols=[];for(let j=0;j<rows[0].ctrl.length;j++)cols.push(interpolate(us,rows.map(r=>r.ctrl[j])));
    const ku=cols[0].knots,ctrl=cols[0].ctrl.map((_,i)=>cols.map(c=>c.ctrl[i]));   // ctrl[u][v]
    const s={type:'bspline',du:cols[0].degree,dv:rows[0].degree,ctrl,weights:null,ku,kv,uPeriodic:false,vPeriodic:false};
    let worst=0,wu=0,wv=0;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=(us[i]+us[i+1])/2,v=(vs[j]+vs[j+1])/2,d=G.dist(G.bsplineSurface(s,u,v).p,exact(u,v));
      if(d>worst){worst=d;}
      // which direction is the error coming from: compare with edge midpoints
      wu=Math.max(wu,G.dist(G.bsplineSurface(s,u,vs[j]).p,exact(u,vs[j])));wv=Math.max(wv,G.dist(G.bsplineSurface(s,us[i],v).p,exact(us[i],v)));}
    if(worst<=tol||(nu>=maxN&&nv>=maxN)){s.deviation=worst;s.grid=[nu,nv];return s;}
    if(wu>=wv*0.5&&nu<maxN)nu*=2;
    if(wv>=wu*0.5&&nv<maxN)nv*=2;
  }
}

/* The same surface, written the way SolidWorks' own STEP export writes it (USB hub TOP, EXP-079):
 * rational quadratic across the blend, so every cross-section is an exact circular arc, and cubic
 * along the spine. The cubic interpolates exact cross-sections in homogeneous coordinates; sections
 * are added until the surface is within `tol` of the exact blend between them. SolidWorks stops at
 * about 1.5e-7 m with 10 sections; the default here is 1e-8 m.
 *
 * Arcs wider than 0.9π are split in two (five control points, a double knot at v = 0.5). */
function arcPoints(sct,split){
  const {c,R,e1,e2,theta}=sct,pt=a=>G.add(c,G.add(G.mul(e1,R*Math.cos(a)),G.mul(e2,R*Math.sin(a))));
  const seg=(a0,a1)=>{const h=(a1-a0)/2,w=Math.cos(h),m=G.add(c,G.add(G.mul(e1,R*Math.cos(a0+h)/w),G.mul(e2,R*Math.sin(a0+h)/w)));return [[pt(a0),1],[m,w],[pt(a1),1]];};
  if(!split)return seg(0,theta);
  const a=seg(0,theta/2),b=seg(theta/2,theta);return [a[0],a[1],a[2],b[1],b[2]];
}
function blendSurfaceRational({spine,supports,t0,t1},{tol=1e-8,nu=8,maxN=4096}={}){
  // A point is on the blend when it is R from the spine (the surface is the envelope of the
  // rolling ball); its two boundary curves must lie on the supports.
  const R=section(spine,supports,(t0+t1)/2).R;
  const off=(P,v)=>{let d=Math.abs(G.curveProject(spine,P).d-R);
    if(v===0||v===1){const f=supports[v].foot(P);d=Math.max(d,G.dist(f,P));}return d;};
  let split=false;for(let i=0;i<=16;i++)if(section(spine,supports,t0+(t1-t0)*i/16).theta>0.9*Math.PI)split=true;
  const kv=split?[0,0,0,0.5,0.5,1,1,1]:[0,0,0,1,1,1],nv=split?5:3;
  for(;;){
    const us=Array.from({length:nu+1},(_,i)=>t0+(t1-t0)*i/nu);
    const H=us.map(u=>arcPoints(section(spine,supports,u),split).map(([p,w])=>[p[0]*w,p[1]*w,p[2]*w,w]));   // homogeneous
    const cols=[];for(let j=0;j<nv;j++)cols.push(interpolate(us,H.map(r=>r[j])));
    const ku=cols[0].knots,ctrl=[],weights=[];
    for(let i=0;i<cols[0].ctrl.length;i++){ctrl.push([]);weights.push([]);
      for(let j=0;j<nv;j++){const q=cols[j].ctrl[i];ctrl[i].push([q[0]/q[3],q[1]/q[3],q[2]/q[3]]);weights[i].push(q[3]);}}
    const s={type:'bspline',du:cols[0].degree,dv:2,ctrl,weights,ku,kv,uPeriodic:false,vPeriodic:false};
    let worst=0,bad=weights.some(r=>r.some(w=>!(w>0)));
    if(!bad)for(let i=0;i<nu;i++)for(const v of [0,0.125,0.25,0.5,0.75,0.875,1]){const u=(us[i]+us[i+1])/2;worst=Math.max(worst,off(G.bsplineSurface(s,u,v).p,v));}
    if(!bad&&worst<=tol){s.deviation=worst;s.grid=[nu,nv];s.form='rational arc × cubic';return s;}
    if(nu>=maxN)return null;   // caller falls back to the bicubic fit
    nu*=2;
  }
}

module.exports={blendSurface,blendSurfaceRational,section,interpolate};
