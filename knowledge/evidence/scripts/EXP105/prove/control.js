'use strict';
// Controls for the EXP-105 prove checks. Prints a JSON report.
const L=require('./lib'),C=require('./check');
const R={};
// 1. synthetic points exactly on a cylinder and a cone, built independently of the distance code, then moved by a known amount along the surface normal
let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const cylP=[0.01,-0.02,0.03],cylA=L.unit([1,2,-0.5]),cylR=0.0123;
// orthonormal frame
const e1=L.unit([cylA[1],-cylA[0],0]),e2=[cylA[1]*e1[2]-cylA[2]*e1[1],cylA[2]*e1[0]-cylA[0]*e1[2],cylA[0]*e1[1]-cylA[1]*e1[0]];
function onCyl(t,th,off){const rr=cylR+off,c=Math.cos(th),s=Math.sin(th);return [0,1,2].map(k=>cylP[k]+t*cylA[k]+rr*(c*e1[k]+s*e2[k]));}
const al=0.37,coneR=0.004;
function onCone(h,th,off){ // h along axis; surface radius coneR+h*tan(al); normal offset 'off' in meridian plane
  const rho=coneR+h*Math.tan(al),c=Math.cos(th),s=Math.sin(th);
  // outward normal in (rho,h): (cos al, -sin al)
  const rr=rho+off*Math.cos(al),hh=h-off*Math.sin(al);
  return [0,1,2].map(k=>cylP[k]+hh*cylA[k]+rr*(c*e1[k]+s*e2[k]));}
let mx1=0,mx2=0;for(let i=0;i<1000;i++){const t=(rnd()-.5)*0.05,th=rnd()*6.28;
  mx1=Math.max(mx1,L.distCylinder(onCyl(t,th,0),cylP,cylA,cylR));
  const h=(rnd()-.2)*0.03;mx2=Math.max(mx2,L.distCone(onCone(h,th,0),cylP,cylA,coneR,al));}
R.syntheticExact={points:1000,maxCylinderDist:mx1,maxConeDist:mx2,note:'must be near 1e-16'};
R.syntheticMoved=[];
for(const off of [1e-3,1e-6,1e-7,1e-8,5e-9,2e-9,5e-10,0]){
  const dc=L.distCylinder(onCyl(0.01,1.0,off),cylP,cylA,cylR),dk=L.distCone(onCone(0.01,1.0,off),cylP,cylA,coneR,al);
  R.syntheticMoved.push({moved:off,cylinderDist:dc,coneDist:dk,flaggedCyl:dc>1e-9,flaggedCone:dk>1e-9});}
// cone beyond apex: nearest point is the apex
{const apexH=-coneR/Math.tan(al);const q=[0,1,2].map(k=>cylP[k]+(apexH-0.001)*cylA[k]);R.beyondApex={dist:L.distCone(q,cylP,cylA,coneR,al),expected:0.001};}

// 2. real parts: C13 cone and C19 half cylinder, every vertex must be on the surface
const root='/home/user/sldprt-research-dump/test files new/SW2022/';
R.real={};
for(const c of ['C13_cone','C19_half_cylinder']){
  const o=C.run(root+c+'/model.SLDPRT');delete o.offList;R.real[c]={verticesChecked:o.verticesChecked,off:o.off,maxDist:o.maxDist};
}
// 3. tampered copy of C13: interior vertex moved 1e-6 m radially (double math, stored float32); boundary vertex moved 3e-9; a boundary vertex put on its neighbours' chord
{
  const loaded=L.load(root+'C13_cone/model.SLDPRT');
  const k=loaded.j.findIndex(x=>x.face&&x.face.surface.type==='cone'),f=loaded.d.faces[k],s=loaded.j[k].face.surface;
  const bset=new Set();for(const c of f.boundaryCycles)for(const v of c.vertices)bset.add(v);
  const pos=i=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
  const set=(i,p)=>{for(let q=0;q<3;q++)f.vertices[3*i+q]=p[q];};
  const radial=(p,amt)=>{const a=L.unit(s.a),w=[0,1,2].map(q=>p[q]-s.p[q]),h=w[0]*a[0]+w[1]*a[1]+w[2]*a[2],pr=[0,1,2].map(q=>w[q]-h*a[q]),n=Math.hypot(...pr);return [0,1,2].map(q=>p[q]+amt*pr[q]/n);};
  const interior=[...Array(f.vertexCount).keys()].filter(i=>!bset.has(i));
  const bnd=[...bset];
  R.tamper={cone:{vertexCount:f.vertexCount,interiorCount:interior.length,boundaryCount:bnd.length}};
  const base=C.run(null,loaded);R.tamper.untouched={off:base.off};
  const i0=interior[0];const orig=pos(i0);set(i0,radial(orig,1e-6));
  let o=C.run(null,loaded);R.tamper.interiorMoved1e6={off:o.off,offBoundary:o.offBoundary,offShared:o.offShared,maxDist:o.maxDist,expectedDist:1e-6};
  set(i0,orig);
  // boundary vertex moved radially off the cone by 3e-9 (shared coordinate then differs from the plane face's copy)
  const b0=bnd[5];const bo=pos(b0);set(b0,radial(bo,3e-9));
  o=C.run(null,loaded);R.tamper.boundaryMoved3e9={off:o.off,offBoundary:o.offBoundary,offShared:o.offShared,maxDist:o.maxDist,note:'float32 storage limits how exactly 3e-9 is stored (half ulp here ~'+L.slack32(bo)+')'};
  set(b0,bo);
  // chord control: move boundary vertex b0 to the midpoint of its two cycle neighbours (on the chord, off the cone)
  const cy=f.boundaryCycles[0].vertices,idx=cy.indexOf(b0),n=cy.length,A=pos(cy[(idx+n-1)%n]),B=pos(cy[(idx+1)%n]);
  const mid=[0,1,2].map(q=>(A[q]+B[q])/2);set(b0,mid);
  o=C.run(null,loaded);const mine=o.offList.find(x=>x.v===b0);R.tamper.onChord={entry:mine,expect:'off, boundary, chordAdj true'};
  // and the same vertex pushed 1e-5 away from the chord, perpendicular to it and radially outward
  set(b0,radial(mid,1e-5));
  o=C.run(null,loaded);const m2=o.offList.find(x=>x.v===b0);R.tamper.offChord={entry:m2,expect:'off, boundary, chord false (adjacent and any pair)'};
  set(b0,bo);
}
console.log(JSON.stringify(R,null,1));
