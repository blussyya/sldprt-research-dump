#!/usr/bin/env node
'use strict';
/* EXP-099 step 13: would a body-aware key fix the display -> B-rep mapping? For the 6 parts whose faces match only after
 * undoing merge()'s id shift (idcheck.json) plus 2f121983: key every B-rep face by (id as the section numbered it, surface type),
 * and count display faces whose (rawId, tag-implied surface type) hits exactly one face (unique), several (ambiguous),
 * or none. Compared with the converter's current key (id as stored after merge(), no type): how many display faces hit exactly one
 * face, and how many of those hit the WRONG face (surface type differs from the tag's). Writes fixcheck.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const CANON={4001:'PLANE',4002:'CYLINDER',4003:'CONE',4004:'SPHERE',4005:'TORUS',4006:'B_SURFACE',4007:'BLENDED_EDGE',4009:'SWEPT_SURF',4010:'SPUN_SURF'};
const idc=JSON.parse(fs.readFileSync(path.join(__dirname,'idcheck.json')));
const list=[...idc.affected.map(x=>x.file),'test files online/2023/2f121983_case.SLDPRT'];
const out={};
for(const rel of list){
  const f=ROOT+rel,p=S.readBrep(f).parsed,d=S.parse(f),m=new Map(p.nodes.map(n=>[n.index,n]));
  const bodies=p.nodes.filter(n=>n.type===12).map(b=>{let s=0;for(const n of p.nodes)if(n.index<b.index){const v=Math.max(typeof n.values.node_id==='number'?n.values.node_id:0,typeof n.values.highest_node_id==='number'?n.values.highest_node_id:0);if(v>s)s=v;}return {idx:b.index,s:b.index>2?s:0};});
  const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,surf:m.get(n.values.surface).name,body:m.get(n.values.shell).values.body}));
  // per body shift = the one that matches more display faces (same rule as dups.js)
  const sh=new Map();for(const b of bodies){let best=[0,-1];for(const s of new Set([0,b.s])){const set=new Set(faces.filter(x=>x.body===b.idx).map(x=>(x.nid-s)+'|'+x.surf));const n=d.faces.filter(x=>x.metadata&&set.has(x.metadata.rawId+'|'+CANON[x.metadata.typeTag])).length;if(n>best[1]||(n===best[1]&&s===0))best=[s,n];}sh.set(b.idx,best[0]);}
  const keyNew=new Map(),keyOld=new Map();
  for(const x of faces){const k=(x.nid-sh.get(x.body))+'|'+x.surf;keyNew.set(k,(keyNew.get(k)||0)+1);}
  const oldById=new Map();for(const x of faces){if(!oldById.has(x.nid))oldById.set(x.nid,[]);oldById.get(x.nid).push(x);}
  const r={displayFaces:0,newUnique:0,newAmbiguous:0,newNone:0,oldHit:0,oldHitWrongType:0,oldNone:0};
  for(const x of d.faces){if(!x.metadata||!CANON[x.metadata.typeTag])continue;r.displayFaces++;
    const c=keyNew.get(x.metadata.rawId+'|'+CANON[x.metadata.typeTag])||0;if(c===1)r.newUnique++;else if(c>1)r.newAmbiguous++;else r.newNone++;
    const o=oldById.get(x.metadata.rawId);if(!o)r.oldNone++;else{r.oldHit++;if(!o.some(y=>y.surf===CANON[x.metadata.typeTag]))r.oldHitWrongType++;}}
  out[rel]=r;
}
fs.writeFileSync(path.join(__dirname,'fixcheck.json'),JSON.stringify(out,null,1)+'\n');
for(const [k,v] of Object.entries(out))console.log(k.split('/').pop().slice(0,26),JSON.stringify(v));
