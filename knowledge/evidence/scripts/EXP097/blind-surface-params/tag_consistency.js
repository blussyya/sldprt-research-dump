'use strict';
// For every linked array face: does the display surface tag (DisplayLists step 9) agree with the
// native surface type of the FACE it was joined to by rawId? Uses the tag table in docs/format/displaylists.md.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const ROOT='/home/user/dump-validation';
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const expect={4001:'PLANE',4002:'CYLINDER',4003:'CONE',4004:'SPHERE',4005:'TORUS',4006:'B_SURFACE',4007:'BLENDED_EDGE',4009:'SWEPT_SURF'};
const tally={consistent:0,mismatch:0,noTagMap:0};const mism=[];const perFile={};
for(const pf of scan.perFile){
  if(!pf.scalarFaces)continue;
  const buf=fs.readFileSync(path.join(ROOT,pf.file));
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  let body={nodes:[]};try{body=partition.readBody(buf,{}).parsed;}catch(e){}
  const byIdx=new Map(body.nodes.map(n=>[n.index,n]));
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const fn=faceNode.get(f.metadata.rawId);if(!fn)continue;
    const s=byIdx.get(fn.values.surface);const nname=s?s.name:'?';
    const exp=expect[f.metadata.typeTag];
    if(!exp){tally.noTagMap++;perFile[pf.file]=(perFile[pf.file]||0)+0;continue;}
    const ok=exp===nname;tally[ok?'consistent':'mismatch']++;
    perFile[pf.file]=perFile[pf.file]||{consistent:0,mismatch:0,noTagMap:0};perFile[pf.file][ok?'consistent':'mismatch']++;
    if(!ok)mism.push({file:pf.file,rawId:f.metadata.rawId,tag:f.metadata.typeTag,nativeSurface:nname});
  }
}
console.log(JSON.stringify({tally,perFile,mismatches:mism},null,1));
