'use strict';
// Strip geometry per Block3 class: winding vs stored normals, degenerate triangles, vertex sharing with the previous strip.
const {S,files,strips}=require('./lib');
const cls={};function C(k){return cls[k]??={strips:0,tris:0,degen:0,windPos:0,windNeg:0,windZero:0,shareStart:0,share2:0,stripN:0};}
const key=(v,i)=>v[3*i]+','+v[3*i+1]+','+v[3*i+2];
for(const file of files()){const d=S.parse(file);
 for(const f of d.faces){if(f.noEdgeTable)continue;const v=f.vertices,n=f.normals;const flagged=f.block3[0]===1;
  const st=strips(f);let base=0,prevKeys=null;
  for(const x of st){
   const name=!flagged?'unflagged strip':(x.s===0?'flagged first':(x.b3ctl===4?'later byte4':'later byte0'));
   const c=C(name);c.strips++;
   const ks=[];for(let i=0;i<x.n;i++)ks.push(key(v,base+i));
   if(prevKeys){ if(ks.slice(0,3).some(k=>prevKeys.includes(k)))c.shareStart++; if(ks[0]===prevKeys[prevKeys.length-1]||ks[0]===prevKeys[prevKeys.length-2])c.share2++;}
   for(let i=2;i<x.n;i++){c.tris++;
    const a=base+(i%2===0?i-2:i-1),b=base+(i%2===0?i-1:i-2),cc=base+i;
    const ux=v[3*b]-v[3*a],uy=v[3*b+1]-v[3*a+1],uz=v[3*b+2]-v[3*a+2],wx=v[3*cc]-v[3*a],wy=v[3*cc+1]-v[3*a+1],wz=v[3*cc+2]-v[3*a+2];
    const nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,len=Math.hypot(nx,ny,nz);
    if(len<1e-14){c.degen++;continue;}
    const sx=n[3*a]+n[3*b]+n[3*cc],sy=n[3*a+1]+n[3*b+1]+n[3*cc+1],sz=n[3*a+2]+n[3*b+2]+n[3*cc+2];
    const dp=(nx*sx+ny*sy+nz*sz)/len;
    if(dp>1e-6)c.windPos++;else if(dp<-1e-6)c.windNeg++;else c.windZero++;}
   prevKeys=ks;base+=x.n;}
 }}
console.table(cls);
