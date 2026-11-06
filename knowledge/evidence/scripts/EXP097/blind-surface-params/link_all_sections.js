'use strict';
// For each display face with the two arrays: is its rawId (display metadata) the node_id of a FACE
// node in (a) the primary body read by readBody, (b) any other partition section of the file?
// Also reports parse errors of each section. Output JSON.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const xt=require(path.join(PKG,'src/parasolid/xt.js'));
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const ROOT='/home/user/dump-validation';
const report=[];
for(const pf of scan.perFile){
  if(!pf.scalarFaces)continue;
  const file=path.join(ROOT,pf.file);const buf=fs.readFileSync(file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  const wanted=r.faces.filter(f=>f.metadata&&f.metadata.scalarArrays.length===2).map(f=>f.metadata.rawId);
  const found=new Map(),sectionInfo=[];
  let primaryErr=null;
  try{const p=partition.readBody(buf,{});primaryErr=p.parsed.error;}catch(e){primaryErr='THREW '+e.message;}
  const all=partition.streams(buf);
  for(const [k,b] of Object.entries(all)){
    const g=b.indexOf(partition.GUID);if(g<4)continue;
    const w=partition.sections(b,g-4);
    for(const x of w.out){
      const q=xt.parse(x.body,true,{});
      const faces=q.nodes.filter(n=>n.type===14).map(n=>n.values.node_id);
      sectionInfo.push({stream:k,kind:x.kind,faces:faces.length,err:q.error});
      for(const id of faces)found.set(id,(found.get(id)||[]).concat([k]));
    }
  }
  const linkedAnySection=wanted.filter(id=>found.has(id)).length;
  report.push({file:pf.file,displayFaces:wanted.length,linkedAnySection,primaryErr,sections:sectionInfo.length,sectionErrors:sectionInfo.filter(s=>s.err).map(s=>s.err).slice(0,3),streams:[...new Set(sectionInfo.map(s=>s.stream))]});
}
console.log(JSON.stringify(report,null,1));
