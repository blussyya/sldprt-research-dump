#!/usr/bin/env node
'use strict';
/* Join the LocalBodies entry flag to the BODY_IN_LIGHTWEIGHT_PERM Parasolid body attribute.
 * EXP-084 established that explicit 0 excludes a body from the finished part and that a missing
 * attribute behaves as included. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const P=require('../../../../package/src/parasolid/partition');
const X=require('../../../../package/src/parasolid/xt');
const prior=require('../EXP091/localbodies.json');

const ROOT=path.resolve(__dirname,'../../../..');
function flag(hex){const b=Buffer.from(hex,'hex');if(b.length===10)return b.readUInt32LE(0);if(b.length===18)return b.readUInt32LE(8);throw Error(`unexpected header length ${b.length}`);}
function payload(stream,section){
  const end=section.offset+section.bytes,parts=[];let at=section.offset+20;
  while(at<end-8){const compressed=stream.readUInt32LE(at+4);parts.push(zlib.inflateSync(stream.subarray(at+8,at+8+compressed)));at+=8+compressed;}
  if(at!==end-8)throw Error('chunk chain does not meet section tail');return Buffer.concat(parts);
}
function definitionName(by,index){
  const d=by.get(index),id=d&&by.get(d.values.identifier),value=id&&id.values.string;
  return Array.isArray(value)?value.join(''):value;
}
function bodyRows(parsed){
  const by=new Map(parsed.nodes.map(n=>[n.index,n]));
  return parsed.nodes.filter(n=>n.type===12).map(body=>{
    const attrs=parsed.nodes.filter(n=>n.type===81&&n.values.owner===body.index),values=[];
    for(const attr of attrs)if(definitionName(by,attr.values.definition)==='BODY_IN_LIGHTWEIGHT_PERM')
      for(const field of attr.values.fields||[]){const n=by.get(field),v=n&&n.values.values;if(Array.isArray(v))values.push(...v.filter(Number.isInteger));}
    return {bodyIndex:body.index,bodyType:body.values.body_type,lightweightPermanent:values.length?values:null};
  });
}

const rows=[],errors=[];
for(const source of prior.streams){
  const stream=P.streams(fs.readFileSync(path.join(ROOT,source.file)))[source.stream];
  for(const entry of source.entries){
    const entryFlag=flag(entry.header),bodies=[];let error=null;
    try{for(const section of entry.sections){const parsed=X.parse(payload(stream,section),true);if(parsed.error)throw Error(parsed.error);bodies.push(...bodyRows(parsed));}}
    catch(e){error=e.message;errors.push({file:source.file,stream:source.stream,name:entry.name,flag:entryFlag,error});}
    rows.push({file:source.file,stream:source.stream,name:entry.name,flag:entryFlag,bodies,...(error?{error}:{})});
  }
}
const decoded=rows.filter(r=>!r.error),bodies=decoded.flatMap(r=>r.bodies.map(b=>({...b,flag:r.flag}))),explicit=bodies.filter(b=>b.lightweightPermanent);
const violations=bodies.filter(b=>b.flag===1?!b.lightweightPermanent?.includes(0):b.lightweightPermanent?.includes(0));
const result={summary:{entries:rows.length,decodedEntries:decoded.length,errors:errors.length,decodedBodies:bodies.length,
  flag0Entries:rows.filter(r=>r.flag===0).length,flag1Entries:rows.filter(r=>r.flag===1).length,
  flag1BodiesWithExplicit0:bodies.filter(b=>b.flag===1&&b.lightweightPermanent?.includes(0)).length,
  flag0BodiesWithExplicit1:bodies.filter(b=>b.flag===0&&b.lightweightPermanent?.includes(1)).length,
  flag0BodiesWithMissingAttribute:bodies.filter(b=>b.flag===0&&!b.lightweightPermanent).length,
  explicitAttributeBodies:explicit.length,violations:violations.length},rows,errors,violations};
fs.writeFileSync(path.join(__dirname,'localbodies-flag.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
