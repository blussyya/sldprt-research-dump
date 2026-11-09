'use strict';
// EXP108 step 1: one row per display edge record (id, type number), joined to the native edge and faces.
const fs=require('fs'),path=require('path');
const CONV=process.env.CONV||'/home/user/conv-dev/src';
const S=require(CONV),P=require(CONV+'/parasolid/partition'),N=require(CONV+'/brep/native'),J=require(CONV+'/brep/display-join');
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):(/\.sldprt$/i.test(e.name)?[p]:[]);});
const files=['test files new','test files online','test files original'].flatMap(d=>walk(path.join(CORPUS,d)));
const out=fs.createWriteStream(path.join(__dirname,'out','rows.jsonl'));
let nparts=0;
for(const f of files){
  let d,M;
  try{const buf=new Uint8Array(fs.readFileSync(f));d=S.parse(f);M=N.build(P.readBody(buf).parsed);}catch(e){continue;}
  const df=d.faces.filter(x=>x.metadata);if(!df.length)continue;
  const j=J.join(df,M);nparts++;
  const rel=path.relative(CORPUS,f);
  df.forEach((x,i)=>{
    const nf=j[i].face;if(!nf||j[i].how==='none')return;
    const eById=new Map();
    for(const l of nf.loops)for(const c of l.coedges){const e=M.edges.get(c.edge);if(e)eById.set(e.displayId,{e,c});}
    x.metadata.edgeRecords.forEach((r,k)=>{
      const h=eById.get(r.id);
      out.write(JSON.stringify({file:rel,face:i,raw:x.metadata.rawId,ftag:x.metadata.typeTag,how:j[i].how,k,id:r.id,t:r.typeTag,
        native:h?{eid:h.e.id,curve:h.e.curve.type,tol:h.e.tolerance,tolerant:h.e.tolerant,fsurf:nf.surface.type}:null})+'\n');
    });
  });
}
out.end();console.error('parts',nparts);
