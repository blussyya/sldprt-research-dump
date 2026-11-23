'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../../../..'),S=require(path.join(root,'../solidworks-converters/src'));
const rows=[];
for(const row of require('./survey.json').filter(r=>r.nonzero)){
 const file=path.join(root,row.file),D=S.parse(file),edges=new Map();
 for(const [fi,f] of D.faces.entries())for(const a of f.edgeAnnotations)if(a.id){
  const k=(a.tokenOffset-f.offsets.block1-16)/4,b=f.block3[k];
  if(!edges.has(a.id))edges.set(a.id,[]);
  const normals=a.vertices.map(i=>Array.from(f.normals.slice(i*3,i*3+3))),positions=a.vertices.map(i=>Array.from(f.vertices.slice(i*3,i*3+3)));
  edges.get(a.id).push({face:fi,byte:b,tag:f.metadata?.typeTag,normals,positions});
 }
 for(const [id,occ] of edges){
  if(!occ.some(a=>a.byte))continue;
  const faces=[...new Set(occ.map(a=>a.face))],bytes=[...new Set(occ.map(a=>a.byte))];let worst=0,matches=0;
  for(let i=0;i<occ.length;i++)for(let j=i+1;j<occ.length;j++)if(occ[i].face!==occ[j].face){
   for(let a=0;a<2;a++)for(let b=0;b<2;b++)if(occ[i].positions[a].every((x,k)=>Math.abs(x-occ[j].positions[b][k])<1e-7)){
    const n=occ[i].normals[a],m=occ[j].normals[b],dot=n.reduce((s,x,k)=>s+x*m[k],0);worst=Math.max(worst,Math.acos(Math.max(-1,Math.min(1,dot))));matches++;
   }
  }
  rows.push({file:row.file,id,faces,bytes,tags:[...new Set(occ.map(a=>a.tag))],normalAngleMax:worst,matches});
 }
}
fs.writeFileSync(path.join(__dirname,'edges.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({edges:rows.length,byteSets:[...new Set(rows.map(r=>r.bytes.sort().join(',')))],mixed:rows.filter(r=>r.bytes.length>1).length,byte2:rows.filter(r=>r.bytes.includes(2)),angles:rows.reduce((o,r)=>{const k=r.bytes.sort().join(',');(o[k]??=[]).push([r.normalAngleMax,r.matches]);return o;},{})},null,2));
