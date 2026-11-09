'use strict';
/* Cylinders in the vector state: v against the radial direction (axis -> box centre of the stored bounds),
 * split by the native face's sameSense and the surface sense. Uses the bounds box centre, no vertices needed. */
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse)
  .filter(r=>r.w[3]===1&&r.w[4]===1&&r.nat&&r.nat.surf.type==='cylinder');
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const res={};
let rad0=0;
for(const r of rows){
  const s=r.nat.surf,v=r.fl.slice(6,9),q=sub(r.bounds.c,s.p),h=dot(q,s.a),p=sub(q,s.a.map(x=>x*h)),l=Math.hypot(...p);
  if(l<1e-9){rad0++;continue;}
  const c=dot(v,p.map(x=>x/l)),ang=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
  const k='sameSense='+r.nat.sameSense;const o=res[k]=res[k]||{n:0,near0_1deg:0,near180_1deg:0,other:0};
  o.n++;if(ang<=1)o.near0_1deg++;else if(ang>=179)o.near180_1deg++;else o.other++;
}
console.log('cylinders',rows.length,'box centre on the axis (skipped)',rad0);console.log(res);
