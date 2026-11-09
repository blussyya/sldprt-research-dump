'use strict';
// Flagged multi-strip faces: later-control byte (4 or 0) vs planarity, file, strip stats, and the strip geometry itself.
const {S,files,strips}=require('./lib');
function planar(f){const n=f.normals,v=f.vertices,c=f.vertexCount;
 for(let i=1;i<c;i++)if(n[3*i]*n[0]+n[3*i+1]*n[1]+n[3*i+2]*n[2]<1-1e-5)return false;
 const d0=n[0]*v[0]+n[1]*v[1]+n[2]*v[2];for(let i=1;i<c;i++)if(Math.abs(n[0]*v[3*i]+n[1]*v[3*i+1]+n[2]*v[3*i+2]-d0)>2e-6)return false;return true;}
const T={},perFile={};const add=(k)=>T[k]=(T[k]||0)+1;
for(const file of files()){const d=S.parse(file);const rel=file.split('/').slice(-1)[0].slice(0,14);
 for(const f of d.faces){if(f.noEdgeTable||f.block3[0]!==1||f.stripLengths.length<2)continue;
  const st=strips(f);const l=st[1].b3ctl;const p=planar(f)?'plane':'curved';
  add(`${p} later=${l}`);
  (perFile[rel]??={})[`${p}:${l}`]=((perFile[rel]??={})[`${p}:${l}`]||0)+1;
 }}
console.log(T);console.table(perFile);
