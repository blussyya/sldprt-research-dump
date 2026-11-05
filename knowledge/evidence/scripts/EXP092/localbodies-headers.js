#!/usr/bin/env node
'use strict';
/* Decode the two LocalBodies entry-header layouts from EXP-091's bounded entry table. The
 * Parasolid payload is parsed only to test whether the still-unknown flag follows body kind. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const P=require('../../../../package/src/parasolid/partition');
const X=require('../../../../package/src/parasolid/xt');
const prior=require('../EXP091/localbodies.json');

const ROOT=path.resolve(__dirname,'../../../..');
function payload(stream,section){
  const end=section.offset+section.bytes,parts=[];let at=section.offset+20;
  while(at<end-8){const compressed=stream.readUInt32LE(at+4);parts.push(zlib.inflateSync(stream.subarray(at+8,at+8+compressed)));at+=8+compressed;}
  if(at!==end-8)throw Error('chunk chain does not meet section tail');
  return Buffer.concat(parts);
}
function decode(hex,firstSectionBytes){
  const b=Buffer.from(hex,'hex'),common=b.length===10?0:8;
  if(b.length!==10&&b.length!==18)throw Error(`unexpected ${b.length}-byte entry header`);
  const out={layoutBytes:b.length};
  if(common){out.reserved=b.readUInt32LE(0);out.sectionCount=b.readUInt32LE(4);}
  out.flag=b.readUInt32LE(common);out.zero0=b[common+4];out.firstSectionSizePlus5=b.readUInt32LE(common+5);out.zero1=b[common+9];
  out.matchesFirstSection=out.firstSectionSizePlus5===firstSectionBytes+1;
  return out;
}

const rows=[],errors=[];
for(const source of prior.streams)try{
  const stream=P.streams(fs.readFileSync(path.join(ROOT,source.file)))[source.stream];
  for(const entry of source.entries){
    const header=decode(entry.header,entry.sections[0].bytes),bodyTypes=[],faceCounts=[];
    let payloadError=null;
    try{for(const section of entry.sections){
        const parsed=X.parse(payload(stream,section),true);
        if(parsed.error)throw Error(parsed.error);
        bodyTypes.push(...parsed.nodes.filter(n=>n.type===12).map(n=>n.values.body_type));
        faceCounts.push(parsed.nodes.filter(n=>n.type===14).length);
      }}catch(e){payloadError=e.message;errors.push({file:source.file,stream:source.stream,name:entry.name,error:e.message});}
    rows.push({file:source.file,stream:source.stream,name:entry.name,...header,sections:entry.sections.length,bodyTypes,faceCounts,...(payloadError?{payloadError}:{})});
  }
}catch(e){errors.push({file:source.file,stream:source.stream,error:e.message});}

const layouts={};for(const n of [10,18]){
  const rs=rows.filter(r=>r.layoutBytes===n);layouts[n]={entries:rs.length,files:new Set(rs.map(r=>r.file)).size,
    flags:Object.fromEntries([...new Set(rs.map(r=>r.flag))].sort().map(v=>[v,rs.filter(r=>r.flag===v).length])),
    sectionCounts:Object.fromEntries([...new Set(rs.map(r=>r.sections))].sort((a,b)=>a-b).map(v=>[v,rs.filter(r=>r.sections===v).length])),
    allReservedZero:n===18&&rs.every(r=>r.reserved===0),allPaddingZero:rs.every(r=>r.zero0===0&&r.zero1===0),
    allFirstSectionSizesMatch:rs.every(r=>r.matchesFirstSection),allSectionCountsMatch:n===18&&rs.every(r=>r.sectionCount===r.sections)};
}
const flagBodies={};for(const flag of [...new Set(rows.map(r=>r.flag))].sort()){
  const rs=rows.filter(r=>r.flag===flag),decoded=rs.filter(r=>!r.payloadError);flagBodies[flag]={entries:rs.length,decodedPayloads:decoded.length,
    bodyTypes:Object.fromEntries([...new Set(decoded.flatMap(r=>r.bodyTypes))].sort().map(v=>[v,decoded.filter(r=>r.bodyTypes.includes(v)).length])),
    bodyCounts:Object.fromEntries([...new Set(decoded.map(r=>r.bodyTypes.length))].sort((a,b)=>a-b).map(v=>[v,decoded.filter(r=>r.bodyTypes.length===v).length]))};
}
const result={summary:{streams:prior.streams.length,entries:rows.length,layouts,flagBodies,errors:errors.length},rows,errors};
fs.writeFileSync(path.join(__dirname,'localbodies-headers.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
