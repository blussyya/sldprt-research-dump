'use strict';
const fs=require('fs'),path=require('path'),S=require(path.resolve(__dirname,'../../../../../../solidworks-converters/src'));
const root=path.resolve(__dirname,'../../../../..'),survey=require('./survey.json'),hist={},examples=[],facePatterns={};
for(const row of survey.filter(r=>r.nonzero)){
 const d=S.parse(path.join(root,row.file));
 for(const [fi,f] of d.faces.entries()){
  let at=0;const controls=new Map();for(const [si,n] of f.block2.entries()){controls.set(at,si);at+=n;}
  const pattern=[];
  for(let i=0;i<f.block3.length;i++){
   const byte=f.block3[i],role=controls.has(i)?(controls.get(i)===0?'firstControl':'laterControl'):(f.block1[i]===0?'interior':'boundary');
   const k=role+':'+byte;hist[k]=(hist[k]||0)+1;
   if(controls.has(i))pattern.push(byte);
   if(byte===2&&examples.length<30)examples.push({file:row.file,face:fi,index:i,role,token:f.block1[i],controls:pattern});
  }
  const p=pattern.length?pattern[0]+':'+[...new Set(pattern.slice(1))].join(','):'none';facePatterns[p]=(facePatterns[p]||0)+1;
 }
}
console.log(JSON.stringify({hist,facePatterns,examples},null,2));
