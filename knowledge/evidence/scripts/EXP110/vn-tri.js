'use strict';
/* Variant: per-triangle normal = normalized sum of the three stored vertex normals. s vs min dot with the
 * stored v; v vs normalized sum of those triangle normals (unweighted and area-weighted). */
const fs=require('fs'),path=require('path');
const S=require('/home/user/conv-dev/src/index');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.w[3]===1&&r.w[4]===1);
const by={};for(const r of rows)(by[r.file]=by[r.file]||[]).push(r);
const nz=a=>{const l=Math.hypot(...a);return l?a.map(x=>x/l):a;};
const res=[];
for(const [file,rs] of Object.entries(by)){
  const d=S.parse(path.join('/home/user/sldprt-research-dump',file));
  for(const r of rs){
    const f=d.faces[r.idx],N=f.normals,P=f.vertices,T=f.triangleIndices,v=r.fl.slice(6,9),s=r.fl[5];
    const tn=[],area=[];
    for(let t=0;t<T.length;t+=3){const [a,b,c]=[T[t],T[t+1],T[t+2]];
      tn.push(nz([0,1,2].map(k=>N[3*a+k]+N[3*b+k]+N[3*c+k])));
      const e1=[0,1,2].map(k=>P[3*b+k]-P[3*a+k]),e2=[0,1,2].map(k=>P[3*c+k]-P[3*a+k]);
      area.push(Math.hypot(e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0])/2);}
    const sm=(w)=>{const q=[0,0,0];tn.forEach((n,i)=>{for(let k=0;k<3;k++)q[k]+=n[k]*(w?area[i]:1);});return nz(q);};
    const dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const vU=sm(false),vW=sm(true);
    const minS=Math.min(...tn.map(n=>dt(n,v)));
    res.push({tag:r.tag,sErr:Math.abs(s-minS),vErrU:Math.acos(Math.min(1,dt(v,vU))),vErrW:Math.acos(Math.min(1,dt(v,vW))),
      sMinU:Math.min(...tn.map(n=>dt(n,vU)))-s});
  }
}
const c=(f,b)=>res.filter(x=>f(x)<=b).length;
console.log('records',res.length);
for(const b of [1e-6,1e-5,1e-4,1e-3])console.log(b,'s==min(triVN.v)',c(x=>x.sErr,b),'v==sumU',c(x=>x.vErrU,b),'v==sumW',c(x=>x.vErrW,b),'s==min(triVN.vU)',c(x=>Math.abs(x.sMinU),b));
