'use strict';
// Own raw reader for DisplayLists face records. Uses the converter only to get the decompressed stream bytes.
const fs=require('fs'),zlib=require('zlib');
const S=require('/home/user/solidworks-converters/src/container/modern'),O=require('/home/user/solidworks-converters/src/container/ole');
const inflateRaw=b=>zlib.inflateRawSync(b,{maxOutputLength:1<<29}),inflateZlib=b=>zlib.inflateSync(b,{maxOutputLength:1<<29});
function dlBytes(path){
  const b=fs.readFileSync(path);
  if(S.isOLE2(b)){const e=O.displayLists(new Uint8Array(b),inflateZlib);return e.bytes?Buffer.from(e.bytes):null;}
  const d=S.findDisplayLists(b,inflateRaw,inflateZlib);return d?Buffer.from(d):null;
}
function hdr(buf,o,stride,kind){ // array header: stride,kind,2,count
  if(o<0||o+16>buf.length)return null;
  if(buf.readUInt32LE(o)!==stride||buf.readUInt32LE(o+4)!==kind||buf.readUInt32LE(o+8)!==2)return null;
  const n=buf.readUInt32LE(o+12),end=o+16+stride*n;return end>buf.length?null:{o,n,end};
}
// Scan: every (4,8,2) pre-array followed by 12/100 positions and 12/100 normals with equal counts.
// Face records only (skip cosmetic overlays: u32 1 right after normals when not legacy).
function scan(buf){
  const sig=Buffer.from([4,0,0,0,8,0,0,0,2,0,0,0]),out=[];let p=0;
  while((p=buf.indexOf(sig,p))>=0){
    const pre=hdr(buf,p,4,8);p++;if(!pre)continue;
    const pos=hdr(buf,pre.end,12,100),nor=pos&&hdr(buf,pos.end,12,100);
    if(!nor||nor.n!==pos.n)continue;
    out.push({off:pre.o,verts:pos.n,posEnd:pos.end,norEnd:nor.end});
  }
  return out;
}
module.exports={dlBytes,hdr,scan};

// Walk one face record from its geometry normals end to the metadata. shift = bytes added to the
// offset where the id/tag block is read (control: shift != 0 must break the tag test).
function meta(buf,x,shift=0){
  const r={off:x.off};
  const b1=hdr(buf,x.norEnd,4,8);if(!b1)return {...r,err:'no block1'};
  const b2=hdr(buf,b1.end,4,8);if(!b2)return {...r,err:'no block2'};
  const b3=hdr(buf,b2.end,1,8);if(!b3)return {...r,err:'no block3'};
  const at=b3.end+132,a8=hdr(buf,at,8,100);if(!a8)return {...r,err:'no a8'};
  const mp=hdr(buf,a8.end+4,12,100);if(!mp)return {...r,err:'no mpos'};
  const mn=hdr(buf,mp.end,12,100);if(!mn)return {...r,err:'no mnor'};
  let o=mn.end;const sf=buf.readUInt32LE(o);o+=4;
  if(sf===1){for(let i=0;i<2;i++){const a=hdr(buf,o,4,100);if(!a)return {...r,err:'bad scalar arr'};o=a.end;}}
  else if(sf!==0)return {...r,err:'scalar flag '+sf};
  const res=[0,4,8].map(k=>buf.readUInt32LE(o+k));
  const q=o+12+shift;
  if(q+4+24+4>buf.length)return {...r,res,err:'eof',resOff:o,sf};
  const id=buf.readUInt32LE(q),tag=buf.readUInt32LE(q+28);
  return {...r,res,id,tag,ge:b3.end,resOff:o,sf,b1n:b1.n,mneg:mn.n,mpn:mp.n};
}
module.exports.meta=meta;
