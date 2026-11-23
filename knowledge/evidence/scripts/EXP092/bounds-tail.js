#!/usr/bin/env node
'use strict';
/* Inventory the 132-byte record selected by the DisplayLists parser. Arithmetic lookalikes and
 * configuration envelopes are deliberately excluded. */
const fs=require('fs'),path=require('path');
const S=require('../../../../package');
const M=require('../../../../package/src/container/modern');
const {corpusFiles,relative}=require('../EXP091/common');

const counts=a=>Object.fromEntries([...new Set(a)].sort((x,y)=>x-y).map(v=>[v,a.filter(x=>x===v).length]));
const rows=[],errors=[];
for(const file of corpusFiles())try{
  const raw=fs.readFileSync(file);if(M.isOLE2(raw))continue;
  const parsed=S.parse(raw);
  for(let index=0;index<parsed.faces.length;index++){
    const face=parsed.faces[index],b=face.bounds&&Buffer.from(face.bounds.raw);
    // Without a decoded metadata tail we cannot prove that bytes 92..131 belong to this record;
    // some layouts place other arrays after the 92-byte bounding-box core.
    if(!b||b.length!==132||!face.metadata)continue;
    const words={w0:b.readUInt32LE(0),w4:b.readUInt32LE(4),w8:b.readUInt32LE(8),
      w92:b.readUInt32LE(92),w96:b.readUInt32LE(96),w100:b.readUInt32LE(100),
      w104:b.readUInt32LE(104),w108:b.readUInt32LE(108),w128:b.readUInt32LE(128)};
    const variant=[112,116,120,124].map(o=>b.readFloatLE(o));
    let unitVector=null;
    if(words.w104===1&&words.w108===1&&variant.every(Number.isFinite)){
      const norm=Math.hypot(variant[1],variant[2],variant[3]);unitVector={scalar:variant[0],vector:variant.slice(1),norm};
      if(face.metadata){
        const d=face.metadata.direction,dn=Math.hypot(...d);
        if(dn)unitVector.absoluteDirectionDot=Math.abs((variant[1]*d[0]+variant[2]*d[1]+variant[3]*d[2])/(norm*dn));
      }
    }
    rows.push({file:relative(file),face:index,typeTag:face.metadata?.typeTag??null,...words,variant,unitVector});
  }
}catch(e){errors.push({file:relative(file),error:e.message});}

const vectorRows=rows.filter(r=>r.unitVector),stateCounts={};
for(const r of rows){const k=[r.w92,r.w96,r.w104,r.w108,r.w128].join(',');stateCounts[k]=(stateCounts[k]||0)+1;}
const byType={};
for(const typeTag of [...new Set(vectorRows.map(r=>r.typeTag))].sort((a,b)=>(a??-1)-(b??-1))){
  const rs=vectorRows.filter(r=>r.typeTag===typeTag),dots=rs.map(r=>r.unitVector.absoluteDirectionDot).filter(Number.isFinite);
  byType[typeTag===null?'unknown':typeTag]={records:rs.length,normMin:Math.min(...rs.map(r=>r.unitVector.norm)),normMax:Math.max(...rs.map(r=>r.unitVector.norm)),
    directionDotCount:dots.length,...(dots.length?{absoluteDirectionDotMin:Math.min(...dots),absoluteDirectionDotMax:Math.max(...dots)}:{})};
}
const summary={modernFiles:new Set(rows.map(r=>r.file)).size,faceRecords:rows.length,
  headWords:{w0:counts(rows.map(r=>r.w0)),w4:counts(rows.map(r=>r.w4)),w8:counts(rows.map(r=>r.w8))},
  tailWords:{w92:counts(rows.map(r=>r.w92)),w96:counts(rows.map(r=>r.w96)),w104:counts(rows.map(r=>r.w104)),w108:counts(rows.map(r=>r.w108)),w128:counts(rows.map(r=>r.w128))},
  states:Object.fromEntries(Object.entries(stateCounts).sort((a,b)=>b[1]-a[1])),unitVectorRecords:vectorRows.length,
  allUnitVectorsWithin1e5:vectorRows.every(r=>Math.abs(r.unitVector.norm-1)<=1e-5),byType,errors:errors.length};
const files=[...new Set(rows.map(r=>r.file))].map(file=>({file,records:rows.filter(r=>r.file===file).length,
  unitVectorRecords:vectorRows.filter(r=>r.file===file).length}));
const stateExamples={};for(const r of rows){const key=[r.w92,r.w96,r.w104,r.w108,r.w128].join(',');
  if((stateExamples[key]||=[]).length<3)stateExamples[key].push(r);}
const result={summary,files,stateExamples,errors};
fs.writeFileSync(path.join(__dirname,'bounds-tail.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
