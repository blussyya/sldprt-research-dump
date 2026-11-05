#!/usr/bin/env node
'use strict';
/* Inventory valid modern-container entries before they are collapsed into a name-keyed object.
 * A candidate counts only after its bounds, inflation size, printable name, and CRC all validate. */
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const M=require('../../../../package/src/container/modern');
const {corpusFiles,relative}=require('../EXP091/common');

const pattern=Uint8Array.from([20,0,6,0,8,0]);
const rol=(b,s)=>(s&=7,s?((b<<s)|(b>>>(8-s)))&255:b);
const rows=[];let entries=0,candidates=0,emptyEntries=0;
for(const file of corpusFiles()){
  const b=fs.readFileSync(file);if(M.isOLE2(b))continue;
  const names=new Map(),key=b[7];
  for(const hit of M.findAll(b,pattern)){
    candidates++;const at=hit-4;if(at<0||at+30>b.length)continue;
    const compressed=b.readUInt32LE(at+18),inflated=b.readUInt32LE(at+22),nameBytes=b.readUInt32LE(at+26);
    if(!compressed||compressed>50e6||nameBytes>1024||at+30+nameBytes+compressed>b.length)continue;
    let name='';for(let i=0;i<nameBytes;i++)name+=String.fromCharCode(rol(b[at+30+i],key));
    if(!name||!/^[\x20-\x7e]+$/.test(name))continue;
    const input=b.subarray(at+30+nameBytes,at+30+nameBytes+compressed);let data;
    try{data=zlib.inflateRawSync(input);}catch(_){try{data=zlib.inflateSync(input);}catch(_){continue;}}
    if(data.length!==inflated||M.crc32(data)!==b.readUInt32LE(at+14))continue;
    if(!data.length){emptyEntries++;continue;}
    entries++;const list=names.get(name)||[];list.push({offset:at,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});names.set(name,list);
  }
  const duplicates=[...names].filter(([,list])=>list.length>1).map(([name,list])=>({name,occurrences:list.length,
    identical:new Set(list.map(x=>x.sha256)).size===1,entries:list}));
  rows.push({file:relative(file),validEntries:[...names.values()].reduce((n,x)=>n+x.length,0),uniqueNames:names.size,duplicates});
}
const duplicates=rows.flatMap(r=>r.duplicates.map(d=>({file:r.file,...d}))),result={summary:{modernFiles:rows.length,
  signatureCandidates:candidates,validEntries:entries,duplicateValidNames:duplicates.length,
  validEmptyEntries:emptyEntries,
  identicalDuplicateNames:duplicates.filter(d=>d.identical).length,conflictingDuplicateNames:duplicates.filter(d=>!d.identical).length},rows,duplicates};
fs.writeFileSync(path.join(__dirname,'duplicate-streams.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
