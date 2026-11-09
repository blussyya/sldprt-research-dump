'use strict';
/* Cylinders (tag 4002 joined to a native cylinder): does the vector state follow the face's angular half-span?
 * half-span = half of the arc (2*pi minus the largest gap) covered by the display vertices around the native axis. */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.nat&&r.nat.surf.type==='cylinder');
const by={};for(const r of rows)(by[r.file]=by[r.file]||[]).push(r);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const out=[];
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join('/home/user/sldprt-research-dump',file));
  for(const r of rs){
    const f=d.faces[r.idx],sf=r.nat.surf,a=sf.a,x=sf.x,y=cross(a,x),ang=[];
    for(let i=0;i<f.vertexCount;i++){const q=[0,1,2].map(k=>f.vertices[3*i+k]-sf.p[k]);ang.push(Math.atan2(dot(q,y),dot(q,x)));}
    ang.sort((p,q)=>p-q);let gap=-1;
    for(let i=0;i<ang.length;i++){const nx=i+1<ang.length?ang[i+1]:ang[0]+2*Math.PI;gap=Math.max(gap,nx-ang[i]);}
    out.push({file,idx:r.idx,vec:r.w[3]===1&&r.w[4]===1,w104:r.w[3],w108:r.w[4],half:(2*Math.PI-gap)/2*180/Math.PI,vc:f.vertexCount,nLoops:r.nat.nLoops});
  }
}
fs.writeFileSync(__dirname+'/cyl-thresh.json',JSON.stringify(out));
const bin=h=>Math.floor(h/10)*10;
const m={};for(const o of out){const k=bin(o.half);(m[k]=m[k]||{w104_0:0,w104_1:0})[o.w104?'w104_1':'w104_0']++;}
console.log('cylinders',out.length);console.log('half-span (deg, 10-deg bins) vs w104');
for(const k of Object.keys(m).map(Number).sort((a,b)=>a-b))console.log(String(k).padStart(4),JSON.stringify(m[k]));
const v=out.filter(o=>o.w104),nv=out.filter(o=>!o.w104);
console.log('w104=1 half-span max',Math.max(...v.map(o=>o.half)),' w104=0 half-span min',Math.min(...nv.map(o=>o.half)));
console.log('w104=0 with half<45:',nv.filter(o=>o.half<45).length,' w104=1 with half>=45:',v.filter(o=>o.half>=45).length);
