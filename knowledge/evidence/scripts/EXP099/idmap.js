#!/usr/bin/env node
'use strict';
/* EXP-099 step 11: what ids does the converter give the colliding faces, and what does src/inspect.js getMesh() do with them?
 * Re-implements inspect.js:156 (byId.has(rawId)) on the two named parts. Writes idmap.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const R='/home/user/sldprt-research-dump/test files online/';
const out={};
for(const rel of ['2023/2f121983_case.SLDPRT','2024/a4ecc6f5_PP-2074-08.SLDPRT']){
  const f=R+rel,p=S.readBrep(f).parsed,d=S.parse(f),M=S.brep.model(p),m=new Map(p.nodes.map(n=>[n.index,n]));
  const nodes=p.nodes.filter(n=>n.type===14);
  const byId=new Map(M.faces.map(x=>[x.id,x]));
  const rec={nativeFaces:M.faces.length,displayFaces:d.faces.length,renumbered:[],inspectMatched:0,inspectUnmatched:0,inspectDistinctTargets:0};
  nodes.forEach((n,i)=>{if(M.faces[i].id!==n.values.node_id)rec.renumbered.push({body:m.get(n.values.shell).values.body,rawNodeId:n.values.node_id,converterId:M.faces[i].id,surface:M.faces[i].surface.type});});
  const used=new Set();
  for(const x of d.faces){const id=x.metadata&&x.metadata.rawId;if(byId.has(id)){rec.inspectMatched++;used.add(id);}else rec.inspectUnmatched++;}
  rec.inspectDistinctTargets=used.size;
  rec.renumberedCount=rec.renumbered.length;rec.renumbered=rec.renumbered.slice(0,6);
  rec.mappingReported=rec.inspectMatched===d.faces.length&&used.size===rec.inspectMatched?'exact':rec.inspectMatched>0?'partial':'none';
  out[rel]=rec;
}
fs.writeFileSync(path.join(__dirname,'idmap.json'),JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out,null,1));
