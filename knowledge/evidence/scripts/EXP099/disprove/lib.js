'use strict';
// Own raw reader for face tail records. Uses the converter only to locate face geometry
// (offsets) and to extract the DisplayLists stream; every metadata field is read here.
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const S='/home/user/solidworks-converters/src/';
const modern=require(S+'container/modern'),ole=require(S+'container/ole'),display=require(S+'display');
const iR=b=>zlib.inflateRawSync(b,{maxOutputLength:1<<28}),iZ=b=>zlib.inflateSync(b,{maxOutputLength:1<<28});
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
function load(file){
  const b=fs.readFileSync(file);if(modern.isOLE2(b))return null;
  let dl;try{dl=modern.findDisplayLists(b,iR,iZ);}catch(e){return null;}
  if(!dl)return null;
  return {b,dl:Buffer.from(dl.buffer?Buffer.from(dl.buffer,dl.byteOffset,dl.byteLength):dl)};
}
// Own raw reader for the metadata block that follows a face's 132-byte bounds record.
// Layout (own reading): [132 bounds][arr8][u32 flag][arr12 pos][arr12 nrm][u32 scalarFlag][2 x arr4 if 1][3 words][u32 id][3 f64][u32 tag]...
function arrAt(dl,o){if(o+16>dl.length)return null;const h=[0,4,8,12].map(k=>dl.readUInt32LE(o+k));if(h[1]!==100&&h[1]!==8&&h[1]!==100)return null;if(h[2]!==2)return null;const end=o+16+h[0]*h[3];if(end>dl.length)return null;return {o,h,end};}
function tail(dl,f){
  const u=o=>o+4<=dl.length?dl.readUInt32LE(o):null;
  const r={ok:false};const start=f.geometryEnd;
  const a8=arrAt(dl,start+132);if(!a8||a8.h[0]!==8)return r;
  const flag=u(a8.end),pos=arrAt(dl,a8.end+4);if(!pos||pos.h[0]!==12)return r;
  const nrm=arrAt(dl,pos.end);if(!nrm||nrm.h[0]!==12)return r;
  let o=nrm.end;const scalarFlag=u(o);o+=4;const sc=[];
  if(scalarFlag===1)for(let i=0;i<2;i++){const a=arrAt(dl,o);if(!a)return {...r,scalarFlag,why:'scalar arr'};sc.push(a.h[3]);o=a.end;}
  const words=[u(o),u(o+4),u(o+8)];
  return {ok:true,start,a8n:a8.h[3],flag,posN:pos.h[3],nrmN:nrm.h[3],nrmEnd:nrm.end,scalarFlag,sc,wordsAt:o,words,rawId:u(o+12),tagAt:o+40,tag:u(o+40),count:u(o+40+68)};
}
module.exports={walk,load,tail,display,iR,iZ};
