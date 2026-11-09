'use strict';
/* EXP-110: one row per modern display face with a decoded id block: the 132-byte bounds record,
 * the display metadata, and the joined native face (converter dev, src/brep/display-join.js).
 * Writes rows.jsonl. Native surface vectors are kept as JSON arrays. */
const fs=require('fs'),path=require('path');
const SRC=process.env.SRC||'/home/user/conv-dev/src';
const S=require(SRC+'/index'),N=require(SRC+'/brep/native'),DJ=require(SRC+'/brep/display-join');
const ROOT='/home/user/sldprt-research-dump/';
const files=[];
for(const base of ['test files original','test files new','test files online']){
  const root=path.join(ROOT,base);if(!fs.existsSync(root))continue;
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
    if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root);
}
const uniq=[...new Set(files.map(p=>path.resolve(p)))].sort();
const out=fs.createWriteStream(path.join(__dirname,'rows.jsonl'));
const log={files:uniq.length,legacy:0,noBrep:0,parts:0,rows:0,errors:[]};
const surf=s=>{const o={type:s.type,sense:s.sense};
  for(const k of ['p','n','a','x','c','r','R','angle'])if(s[k]!==undefined)o[k]=s[k];return o;};
for(const file of uniq){
  const rel=path.relative(ROOT,file);let d,M;
  try{d=S.parse(file);}catch(e){log.errors.push([rel,'display '+e.message]);continue;}
  if(/legacy/.test(d.format)){log.legacy++;continue;}
  try{const B=S.readBrep(file);M=N.build(B.parsed);}catch(e){log.noBrep++;log.errors.push([rel,'brep '+e.message]);M=null;}
  log.parts++;
  const faces=d.faces.filter(f=>f.metadata&&f.bounds&&f.bounds.raw.length===132);
  const joins=M?DJ.join(faces,M):faces.map(()=>({face:null,how:'nobrep'}));
  faces.forEach((f,i)=>{
    const b=Buffer.from(f.bounds.raw),j=joins[i];
    const w=[];for(let o=92;o<132;o+=4)w.push(b.readUInt32LE(o));
    const fl=[];for(let o=92;o<132;o+=4)fl.push(b.readFloatLE(o));
    const row={file:rel,idx:d.faces.indexOf(f),tag:f.metadata.typeTag,rawId:f.metadata.rawId,
      hex:b.slice(92).toString('hex'),w,fl,
      bounds:{min:f.bounds.min,max:f.bounds.max,c:f.bounds.center,r:f.bounds.radius},
      dir:f.metadata.direction,par:f.metadata.parameters,vc:f.vertexCount,scalarFlag:f.metadata.scalarFlag,
      auxFlag:f.metadata.auxiliaryFlag,nEdges:f.metadata.edgeRecords.length,
      how:j.how,nat:j.face?{id:j.face.id,body:j.face.body,bodyType:(M.bodies.find(b=>b.regions.some(r=>r.shells.some(s=>s.faces.includes(j.face.id)||s.reversed.includes(j.face.id))))||{}).type||null,sameSense:j.face.sameSense,surf:surf(j.face.surface),nLoops:j.face.loops.length,nCoedges:j.face.loops.reduce((a,l)=>a+l.coedges.length,0)}:null,nBodies:M?M.bodies.length:null};
    out.write(JSON.stringify(row)+'\n');log.rows++;
  });
}
out.end();
fs.writeFileSync(path.join(__dirname,'extract.log.json'),JSON.stringify(log,null,1));
console.log(JSON.stringify({...log,errors:log.errors.length}));
