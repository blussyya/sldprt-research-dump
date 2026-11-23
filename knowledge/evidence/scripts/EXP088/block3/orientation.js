'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../../../..'),S=require(path.join(root,'../solidworks-converters/src'));
const counts={},examples={},errors=[];
for(const row of require('./survey.json').filter(r=>r.nonzero))try{
 const file=path.join(root,row.file),D=S.parse(file),M=S.brep.model(S.readBrep(file).parsed);
 for(const [fi,f] of D.faces.entries())for(const a of f.edgeAnnotations){
  const e=M.edges.get(a.id);if(!e||!e.v||e.v.length!==2)continue;
  const c=e.curve.type==='trimmed'?e.curve.basis:e.curve;if(c.type!=='line')continue;
  const p=M.vertices.get(e.v[0])?.p,q=M.vertices.get(e.v[1])?.p;if(!p||!q)continue;
  const x=Array.from(f.vertices.slice(3*a.vertices[0],3*a.vertices[0]+3)),y=Array.from(f.vertices.slice(3*a.vertices[1],3*a.vertices[1]+3));
  const dot=x.reduce((s,v,k)=>s+(y[k]-v)*(q[k]-p[k]),0);if(Math.abs(dot)<1e-20)continue;
  const byte=f.block3[(a.tokenOffset-f.offsets.block1-16)/4],key=byte+':'+(dot>0?'forward':'reverse');counts[key]=(counts[key]||0)+1;
  if(!examples[key])examples[key]={file:row.file,face:fi,edge:a.id,byte,dot,vertices:a.vertices};
 }
}catch(e){errors.push({file:row.file,error:e.message});}
console.log(JSON.stringify({counts,examples,errors},null,2));
