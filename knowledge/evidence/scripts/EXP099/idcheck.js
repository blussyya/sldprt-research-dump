#!/usr/bin/env node
'use strict';
/* EXP-099 step 7: how far does the LocalBodies id shift reach? For every modern part with display metadata
 * and a readable B-rep, count display faces whose (rawId, tag) names a B-rep face (a) with the id as the converter
 * stores it, (b) only after subtracting the shift merge() applied to that body, (c) neither.
 * Tag -> surface type is the table from dups.js (majority per tag); 4008 has no data and is skipped.
 * Control: the same count on a face id +1 (should drop to ~0 matches) is reported as 'plusOne'.
 * Writes idcheck.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const sw=JSON.parse(fs.readFileSync(path.join(__dirname,'sweep.json')));
const CANON={4001:'PLANE',4002:'CYLINDER',4003:'CONE',4004:'SPHERE',4005:'TORUS',4006:'B_SURFACE',4007:'BLENDED_EDGE',4009:'SWEPT_SURF',4010:'SPUN_SURF'};
const rows=[];const tot={parts:0,faces:0,direct:0,shifted:0,neither:0,plusOneDirect:0};
for(const part of sw.parts){
  if(part.error||part.format!=='modern DisplayLists'||!part.withMetadata||part.odd.length)continue;
  const f=ROOT+part.file;let r;try{r=S.readBrep(f);}catch(e){continue;}
  const p=r.parsed,m=new Map(p.nodes.map(n=>[n.index,n])),d=S.parse(f);
  const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,surf:m.get(n.values.surface).name,body:m.get(n.values.shell)&&m.get(n.values.shell).values.body}));
  const bodies=p.nodes.filter(n=>n.type===12).map(b=>{let s=0;for(const n of p.nodes)if(n.index<b.index){const v=Math.max(typeof n.values.node_id==='number'?n.values.node_id:0,typeof n.values.highest_node_id==='number'?n.values.highest_node_id:0);if(v>s)s=v;}return {idx:b.index,shift:b.index>2?s:0};});
  const sh=new Map(bodies.map(b=>[b.idx,b.shift]));
  const direct=new Set(faces.map(x=>x.nid+'|'+x.surf)),shifted=new Set(faces.filter(x=>sh.get(x.body)>0).map(x=>(x.nid-sh.get(x.body))+'|'+x.surf));
  let a=0,b=0,c=0,p1=0,n=0;
  for(const x of d.faces){if(!x.metadata||!CANON[x.metadata.typeTag])continue;n++;const k=x.metadata.rawId+'|'+CANON[x.metadata.typeTag];
    if(direct.has(k))a++;else if(shifted.has(k))b++;else c++;
    if(direct.has((x.metadata.rawId+1)+'|'+CANON[x.metadata.typeTag]))p1++;}
  rows.push({file:part.file,bodies:bodies.length,faces:n,direct:a,shiftedOnly:b,neither:c,plusOneDirect:p1,faceCount:faces.length});
  tot.parts++;tot.faces+=n;tot.direct+=a;tot.shifted+=b;tot.neither+=c;tot.plusOneDirect+=p1;
}
const affected=rows.filter(x=>x.shiftedOnly>0);
const out={totals:tot,partsWithShiftedFaces:affected.length,affected,partsWithNeither:rows.filter(x=>x.neither>0).map(x=>({file:x.file,neither:x.neither,faces:x.faces,bodies:x.bodies}))};
fs.writeFileSync(path.join(__dirname,'idcheck.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(tot),'\nshifted parts',JSON.stringify(affected.map(x=>[x.file.split('/').pop().slice(0,24),x.bodies,x.faces,x.direct,x.shiftedOnly,x.neither])),'\nneither',JSON.stringify(out.partsWithNeither.map(x=>[x.file.split('/').pop().slice(0,24),x.neither,x.faces,x.bodies])));
