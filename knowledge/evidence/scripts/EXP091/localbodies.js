#!/usr/bin/env node
'use strict';
/* LocalBodies is an entry table. Each entry begins with an MFC CString name and owns one or more
 * Parasolid section frames. A ten-byte continuation header separates additional frames belonging
 * to the same named entry. This survey follows the outer size field even for the two large frames
 * whose compressed payload is split and therefore fails the older single-zlib check. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const P=require('../../../../package/src/parasolid/partition');
const {corpusFiles,relative}=require('./common');

function archiveCount(b,o){
  let n=b[o++];if(n<0xff)return {n,end:o};
  n=b.readUInt16LE(o);o+=2;if(n<0xffff)return {n,end:o};
  n=b.readUInt32LE(o);return {n,end:o+4};
}
function cstring(b,o){
  const start=o;let unicode=false;
  if(b[o]===0xff&&b.readUInt16LE(o+1)===0xfffe){unicode=true;o+=3;}
  const q=archiveCount(b,o),bytes=q.n*(unicode?2:1),end=q.end+bytes;
  if(end>b.length)throw Error('CString outside stream');
  return {start,end,unicode,length:q.n,value:b.subarray(q.end,end).toString(unicode?'utf16le':'latin1')};
}
function frameAt(b,start){
  if(start+28>b.length||!b.subarray(start+4,start+20).equals(P.GUID))throw Error('section GUID');
  const size=b.readUInt32LE(start),end=start+4+size;
  if(end>b.length)throw Error('section size outside stream');
  const bodies=[],chunks=[];let q=start+20;
  while(q<end-8){
    if(q+8>end-8)throw Error('truncated chunk header');
    const inflated=b.readUInt32LE(q),compressed=b.readUInt32LE(q+4),zEnd=q+8+compressed;
    if(zEnd>end-8)throw Error('compressed chunk outside section');
    const body=zlib.inflateSync(b.subarray(q+8,zEnd));
    if(body.length!==inflated)throw Error('inflated chunk length');
    chunks.push({offset:q,inflated,compressed});bodies.push(body);q=zEnd;
  }
  if(q!==end-8)throw Error('chunk chain does not meet section tail');
  const body=Buffer.concat(bodies),head=body.subarray(0,80).toString('latin1');
  const kind=(head.match(/TRANSMIT FILE(?: \((\w+)\))?/)||[])[1]||(/TRANSMIT FILE/.test(head)?'plain':'?');
  return {start,end,size,chunks,totalInflated:body.length,kind,tail:b.subarray(end-8,end).toString('hex')};
}
function nextFrame(b,from){
  const g=b.indexOf(P.GUID,from);return g>=4?g-4:-1;
}
function continuation(b,o){
  if(o+10>b.length||b.subarray(o,o+5).some(x=>x!==0)||b[o+9]!==0)return null;
  const start=o+10;if(start+4>b.length)return null;
  const advertised=b.readUInt32LE(o+5),size=b.readUInt32LE(start);
  return advertised===size+5&&b.subarray(start+4,start+20).equals(P.GUID)?{start,advertised}:null;
}

const streams=[],errors=[];
for(const file of corpusFiles())try{
  for(const [name,b] of Object.entries(P.streams(fs.readFileSync(file))))if(/LocalBodies$/i.test(name)){
    const entryCount=b.readUInt32LE(0),entries=[];let at=4;
    for(let i=0;i<entryCount;i++){
      const label=cstring(b,at),first=nextFrame(b,label.end);
      if(first<0)throw Error('entry without a section');
      const header=b.subarray(label.end,first),sections=[];let frame=frameAt(b,first);sections.push(frame);at=frame.end;
      while(true){const c=continuation(b,at);if(!c)break;frame=frameAt(b,c.start);sections.push(frame);at=frame.end;}
      entries.push({name:label.value,nameEncoding:label.unicode?'UTF-16LE':'byte',header:header.toString('hex'),
        sections:sections.map(x=>({offset:x.start,bytes:x.size+4,chunks:x.chunks,totalInflated:x.totalInflated,
          kind:x.kind,tail:x.tail}))});
    }
    streams.push({file:relative(file),stream:name,bytes:b.length,entryCount,entries,complete:at===b.length,leftover:b.length-at});
  }
}catch(e){errors.push({file:relative(file),error:e.stack||e.message});}

const allEntries=streams.flatMap(s=>s.entries),allSections=allEntries.flatMap(e=>e.sections);
const result={summary:{files:corpusFiles().length,streams:streams.length,entries:allEntries.length,sections:allSections.length,
  multiSectionEntries:allEntries.filter(e=>e.sections.length>1).length,maxSectionsPerEntry:Math.max(...allEntries.map(e=>e.sections.length)),
  completeStreams:streams.filter(s=>s.complete).length,zeroTails:allSections.filter(s=>s.tail==='0000000000000000').length,
  singleChunkSections:allSections.filter(s=>s.chunks.length===1).length,multiChunkSections:allSections.filter(s=>s.chunks.length>1).length,
  chunks:allSections.reduce((n,s)=>n+s.chunks.length,0),
  errors:errors.length},streams,errors};
fs.writeFileSync(path.join(__dirname,'localbodies.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
