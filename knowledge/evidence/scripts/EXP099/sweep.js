#!/usr/bin/env node
'use strict';
/* EXP-099 step 1: sweep the corpus. Per part: display faces with metadata, rawIds that repeat,
 * typeTag histogram, tags outside 4001..4010. Writes sweep.json. */
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',S=require(CONV);
const ROOT='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const files=fs.readdirSync(ROOT).filter(n=>n.startsWith('test files')).flatMap(n=>walk(path.join(ROOT,n)));
const out={files:files.length,parts:[],totals:{}};
const tagHist={};let faces=0,meta=0,dupParts=0,dupIds=0,dupFaces=0;
for(const f of files){
  let d;try{d=S.parse(f);}catch(e){out.parts.push({file:f,error:e.message});continue;}
  const fc=d.faces||[],m=fc.filter(x=>x.metadata);faces+=fc.length;meta+=m.length;
  const by=new Map();m.forEach((x,i)=>{const k=x.metadata.rawId;if(!by.has(k))by.set(k,[]);by.get(k).push(i);});
  const dups=[...by].filter(([k,v])=>v.length>1).map(([k,v])=>({rawId:k,faceIdx:v,offsets:v.map(i=>m[i].offset),tags:v.map(i=>m[i].metadata.typeTag),vertexCounts:v.map(i=>m[i].vertexCount)}));
  const odd=m.filter(x=>x.metadata.typeTag<4001||x.metadata.typeTag>4010).map(x=>({offset:x.offset,metaOffset:x.metadata.offset,rawId:x.metadata.rawId,typeTag:x.metadata.typeTag,edgeRecords:x.metadata.edgeRecords.length}));
  m.forEach(x=>{tagHist[x.metadata.typeTag]=(tagHist[x.metadata.typeTag]||0)+1;});
  if(dups.length){dupParts++;dupIds+=dups.length;dupFaces+=dups.reduce((s,x)=>s+x.faceIdx.length,0);}
  out.parts.push({file:path.relative(ROOT,f),format:d.format,faces:fc.length,withMetadata:m.length,metadataErrors:fc.filter(x=>x.metadataError).length,dups,odd,rejected:(d.rejected||[]).length});
}
out.totals={faces,withMetadata:meta,partsWithDuplicateIds:dupParts,duplicatedIds:dupIds,facesInDuplicatedIds:dupFaces,tagHist};
fs.writeFileSync(path.join(__dirname,'sweep.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(out.totals),'\n',out.parts.filter(p=>p.dups&&p.dups.length).map(p=>p.file+' '+p.dups.length),'\n',out.parts.filter(p=>p.odd&&p.odd.length).map(p=>p.file+' '+JSON.stringify(p.odd)),'\n errors',out.parts.filter(p=>p.error).length);
