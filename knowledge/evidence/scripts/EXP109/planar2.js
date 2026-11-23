'use strict';
// (a) nonplanar faces in files with no nonzero Block3 (control). (b) flagged planes in mixed files: what are they?
const {S,files,strips}=require('./lib');
function planar(f){const n=f.normals,v=f.vertices,c=f.vertexCount;
 for(let i=1;i<c;i++)if(n[3*i]*n[0]+n[3*i+1]*n[1]+n[3*i+2]*n[2]<1-1e-5)return false;
 const d0=n[0]*v[0]+n[1]*v[1]+n[2]*v[2];for(let i=1;i<c;i++)if(Math.abs(n[0]*v[3*i]+n[1]*v[3*i+1]+n[2]*v[3*i+2]-d0)>2e-6)return false;return true;}
let zeroFiles=0,zeroNonPlanar=0,zeroPlanar=0;const fp=[];
for(const file of files()){const d=S.parse(file);const fs_=d.faces.filter(f=>!f.noEdgeTable);
 const any=fs_.some(f=>f.block3[0]===1);
 if(!any){zeroFiles++;fs_.forEach(f=>planar(f)?zeroPlanar++:zeroNonPlanar++);continue;}
 const pu=fs_.filter(f=>planar(f)&&f.block3[0]===0).length;
 for(const [i,f] of fs_.entries())if(planar(f)&&f.block3[0]===1&&pu>0){
  const eb=new Set(f.block3.filter((b,k)=>b&&k!==0));
  fp.push({file:file.split('/').slice(-1)[0].slice(0,20),i,strips:f.stripLengths.length,vc:f.vertexCount,tag:f.metadata?.typeTag,ebytes:[...eb].join('')||'-',nedge:new Set(f.edgeAnnotations.map(a=>a.id).filter(Boolean)).size});}
}
console.log({zeroFiles,zeroNonPlanar,zeroPlanar});console.table(fp);
