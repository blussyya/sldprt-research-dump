#!/usr/bin/env node
'use strict';
/* EXP-099 step 6: why do display rawIds repeat? For each corpus part with a repeated rawId, match
 * display faces to B-rep faces by (id, surface type) and say which body each repeat belongs to.
 * Pass 1 builds tag -> surface type from parts whose B-rep node_ids are unique (control: the table
 * must be one surface type per tag). Pass 2 matches with id as stored (shift 0) and with the id shift
 * src/parasolid/partition.js merge() applies to LocalBodies (the largest node_id/highest_node_id
 * among the earlier nodes), per body, taking whichever matches more. Writes dups.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const sw=JSON.parse(fs.readFileSync(path.join(__dirname,'sweep.json')));
function load(rel){
  const f=ROOT+rel,d=S.parse(f);let r;try{r=S.readBrep(f);}catch(e){return {d,err:e.message};}
  const p=r.parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
  const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,surf:m.get(n.values.surface).name,body:m.get(n.values.shell)&&m.get(n.values.shell).values.body}));
  const bodies=p.nodes.filter(n=>n.type===12).map(b=>{let s=0;for(const n of p.nodes)if(n.index<b.index){const v=Math.max(typeof n.values.node_id==='number'?n.values.node_id:0,typeof n.values.highest_node_id==='number'?n.values.highest_node_id:0);if(v>s)s=v;}return {idx:b.index,hi:b.values.highest_node_id,shiftIfMerged:b.index>2?s:0,hidden:(p.hidden||[]).includes(b.index)};});
  return {d,faces,bodies,hidden:p.hidden||[]};
}
// pass 1
const tagSurf={};let ctl={pairs:0,parts:0};
for(const part of sw.parts){
  if(part.error||part.format!=='modern DisplayLists'||part.withMetadata===0||part.odd.length)continue;
  const L=load(part.file);if(L.err)continue;
  const cnt={};L.faces.forEach(f=>cnt[f.nid]=(cnt[f.nid]||0)+1);
  if(Object.values(cnt).some(v=>v>1))continue;
  const by=new Map(L.faces.map(f=>[f.nid,f]));ctl.parts++;
  for(const f of L.d.faces)if(f.metadata&&by.has(f.metadata.rawId)){const k=f.metadata.typeTag,s=by.get(f.metadata.rawId).surf;(tagSurf[k]=tagSurf[k]||{})[s]=(tagSurf[k][s]||0)+1;ctl.pairs++;}
}
// pass 2
const out={tagSurface:tagSurf,tagSurfaceControl:ctl,parts:{}};
const sum={parts:0,dupGroups:0,facesInGroups:0,groupsAllDifferentBodies:0,groupsSameBodyPair:0,groupsOtherOrUnmatched:0};
for(const part of sw.parts){
  if(!part.dups||!part.dups.length)continue;
  if(part.odd.length){out.parts[part.file]={skipped:'rawIds are misreads (see odd tags)',dupGroups:part.dups.length};continue;}
  const L=load(part.file);if(L.err){out.parts[part.file]={error:L.err};continue;}
  const surfOf=t=>Object.entries(tagSurf[t]||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  // per body: choose shift 0 or shiftIfMerged by number of display faces matched
  const bodyShift=new Map();
  for(const b of L.bodies){const fs_=L.faces.filter(f=>f.body===b.idx);let best=[0,-1];
    for(const sh of new Set([0,b.shiftIfMerged])){const set=new Set(fs_.map(f=>(f.nid-sh)+'|'+f.surf));const n=L.d.faces.filter(x=>x.metadata&&set.has(x.metadata.rawId+'|'+surfOf(x.metadata.typeTag))).length;if(n>best[1]||(n===best[1]&&sh===0))best=[sh,n];}
    bodyShift.set(b.idx,best[0]);}
  const key=(f)=>(f.nid-(bodyShift.get(f.body)||0))+'|'+f.surf;
  const nat=new Map();L.faces.forEach(f=>{const k=key(f);{if(!nat.has(k))nat.set(k,[]);nat.get(k).push(f);}});
  const groups=new Map();L.d.faces.forEach((x,i)=>{if(!x.metadata)return;{if(!groups.has(x.metadata.rawId))groups.set(x.metadata.rawId,[]);groups.get(x.metadata.rawId).push(i);}});
  const rec={displayFaces:L.d.faces.length,bodies:L.bodies.map(b=>({idx:b.idx,faces:L.faces.filter(f=>f.body===b.idx).length,shiftUsed:bodyShift.get(b.idx),hidden:b.hidden})),dupGroups:0,verdicts:{},examples:[]};
  const avail=new Map([...nat].map(([k,v])=>[k,[...v]]));
  // consume native faces for unique ids first so repeated ids get the leftovers
  for(const [rid,idxs] of groups){
    const bodies=[];let unm=0;
    for(const i of idxs){const k=rid+'|'+surfOf(L.d.faces[i].metadata.typeTag);const c=avail.get(k)||[];const f=c.shift();if(f)bodies.push(f.body);else unm++;}
    if(idxs.length>1){
      rec.dupGroups++;let v;
      if(unm)v='unmatched member';else if(new Set(bodies).size===bodies.length)v='each member in a different body';else if(new Set(bodies).size===1)v='all members in one body';else v='some share a body';
      rec.verdicts[v]=(rec.verdicts[v]||0)+1;if(rec.examples.length<3)rec.examples.push({rawId:rid,display:idxs,tags:idxs.map(i=>L.d.faces[i].metadata.typeTag),bodies});
      sum.dupGroups++;sum.facesInGroups+=idxs.length;
      if(v==='each member in a different body')sum.groupsAllDifferentBodies++;else if(v==='all members in one body')sum.groupsSameBodyPair++;else sum.groupsOtherOrUnmatched++;
    }
  }
  sum.parts++;out.parts[part.file]=rec;
}
out.summary=sum;
fs.writeFileSync(path.join(__dirname,'dups.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify({tagSurface:tagSurf,ctl,summary:sum},null,1));
for(const [k,v] of Object.entries(out.parts))console.log(k.split('/').pop().slice(0,30),JSON.stringify(v.verdicts||v));
