'use strict';
/* Cylinders in the vector state: compare v and acos(s) with the angular arc the face's display vertices
 * cover around the native axis. Arc = complement of the largest gap between sorted vertex angles. */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const ROOT='/home/user/sldprt-research-dump/';
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse)
  .filter(r=>r.w[3]===1&&r.w[4]===1&&r.nat&&r.nat.surf.type==='cylinder');
const by={};for(const r of rows)(by[r.file]=by[r.file]||[]).push(r);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const out=[];
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join(ROOT,file));
  for(const r of rs){
    const f=d.faces[r.idx],sf=r.nat.surf,a=sf.a,x=sf.x,y=cross(a,x);
    const v=r.fl.slice(6,9),s=r.fl[5];
    const ang=[];
    for(let i=0;i<f.vertexCount;i++){const q=[f.vertices[3*i]-sf.p[0],f.vertices[3*i+1]-sf.p[1],f.vertices[3*i+2]-sf.p[2]];ang.push(Math.atan2(dot(q,y),dot(q,x)));}
    ang.sort((p,q)=>p-q);
    let gap=-1,gi=0;for(let i=0;i<ang.length;i++){const nx=i+1<ang.length?ang[i+1]:ang[0]+2*Math.PI,g=nx-ang[i];if(g>gap){gap=g;gi=i;}}
    const span=2*Math.PI-gap;
    const start=ang[(gi+1)%ang.length];const mid=start+span/2;
    const vang=Math.atan2(dot(v,y),dot(v,x));let dm=vang-mid;dm=Math.atan2(Math.sin(dm),Math.cos(dm));
    out.push({file,idx:r.idx,span,half:span/2,acosS:Math.acos(s),dMid:dm,vPerp:Math.abs(dot(v,a)),vc:f.vertexCount,sameSense:r.nat.sameSense,r:sf.r});
  }
}
fs.writeFileSync(__dirname+'/cyl-span.json',JSON.stringify(out));
const full=out.filter(o=>o.span>2*Math.PI-0.5);
const part=out.filter(o=>o.span<=2*Math.PI-0.5);
const dg=x=>x*180/Math.PI;
console.log('cyl vector rows',out.length,'near-full arcs',full.length);
const rd=part.map(o=>o.acosS-o.half);
console.log('partial arcs',part.length,'acos(s)-half deg: min/median/max',dg(Math.min(...rd)),dg(rd.sort((a,b)=>a-b)[rd.length>>1]),dg(Math.max(...rd)));
const dm=part.map(o=>Math.abs(o.dMid));
console.log('|v angle - arc mid| deg: median',dg(dm.sort((a,b)=>a-b)[dm.length>>1]),'max',dg(dm[dm.length-1]));
for(const bar of [1e-4,1e-3,1e-2])console.log('acos(s)==half within',bar,'rad:',part.filter(o=>Math.abs(o.acosS-o.half)<bar).length,' v==mid within',bar,part.filter(o=>Math.abs(o.dMid)<bar).length);
console.log('sample',part.slice(0,6).map(o=>[dg(o.half).toFixed(2),dg(o.acosS).toFixed(2),dg(o.dMid).toFixed(2)].join('/')));
