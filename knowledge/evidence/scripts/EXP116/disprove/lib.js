'use strict';
// Shared helpers for the disprove scripts. The converter is used only to inflate the
// container and to find face records (strips, positions, normals, Block1/2/3 and geometryEnd).
// Everything after geometryEnd is read here, not with src/display.js metadata.
const fs=require('fs'),path=require('path');
const S=require('/home/user/solidworks-converters/src');
const modern=require('/home/user/solidworks-converters/src/container/modern');
const display=require('/home/user/solidworks-converters/src/display');
const ROOT='/home/user/sldprt-research-dump';
function listFiles(){
  const out=[];
  (function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
    if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))out.push(p);}})(ROOT);
  return out.filter(p=>/test files (online|new|original)/.test(p)).sort();
}
function dlBytes(file){
  const b=fs.readFileSync(file);
  if(modern.isOLE2(b))return {legacy:true};
  const dl=modern.findDisplayLists(b,S.inflateRaw,S.inflateZlib);
  let ver=null;try{const s=modern.decompressOpenSX(b,S.inflateRaw,S.inflateZlib);ver=modern.displayListsVersion(s);}catch(e){}
  return {dl,ver,raw:b};
}
function faces(dl){return display.extractDisplayLists(dl,false);}
// own readers
const mk=dl=>{const d=new DataView(dl.buffer,dl.byteOffset,dl.byteLength);
  return {u:o=>(o+4<=dl.length&&o>=0)?d.getUint32(o,true):null,f:o=>(o+8<=dl.length&&o>=0)?d.getFloat64(o,true):null,len:dl.length,
    hdr:(o,s,k)=>o+16<=dl.length&&d.getUint32(o,true)===s&&d.getUint32(o+4,true)===k&&d.getUint32(o+8,true)===2?d.getUint32(o+12,true):null};};
module.exports={S,listFiles,dlBytes,faces,mk,ROOT};
