'use strict';
// For every display face with the two optional arrays: its surface tag, and the native surface
// type it is linked to by rawId (= Parasolid FACE node_id). Output JSON.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const ROOT='/home/user/dump-validation';
const out=[],byTag={},byNative={};
for(const pf of scan.perFile){
  if(!pf.scalarFaces)continue;
  const file=path.join(ROOT,pf.file);const buf=fs.readFileSync(file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  let nat=null,natErr=null;
  try{nat=partition.readBody(buf,{}).parsed;}catch(e){natErr=e.message;}
  const faceById=new Map(),nodeByIndex=new Map();
  if(nat){for(const n of nat.nodes){nodeByIndex.set(n.index,n);if(n.type===14)faceById.set(n.values.node_id,n);}}
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const tag=f.metadata.typeTag;byTag[tag]=(byTag[tag]||0)+1;
    let nname='NO_NATIVE';
    if(nat){const face=faceById.get(f.metadata.rawId);
      if(face){const s=nodeByIndex.get(face.values.surface);nname=s?s.name:'MISSING_SURFACE';}}
    else nname='NATIVE_UNREADABLE';
    byNative[nname]=(byNative[nname]||0)+1;
    out.push({file:pf.file,rawId:f.metadata.rawId,tag,native:nname,nv:f.vertexCount,natErr});
  }
}
console.log(JSON.stringify({byTag,byNative,rows:out.length},null,1));
fs.writeFileSync(path.join(__dirname,'survey_types.out.json'),JSON.stringify(out,null,1));
