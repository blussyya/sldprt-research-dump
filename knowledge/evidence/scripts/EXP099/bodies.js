#!/usr/bin/env node
'use strict';
/* EXP-099 step 2: the two named parts. Which Parasolid body does each display face belong to?
 * Matches display (rawId, typeTag) to B-rep faces by (node_id, surface type) and by
 * (node_id - base, surface type) where base is the highest_node_id of the earlier body.
 * Writes bodies.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const R='/home/user/sldprt-research-dump/test files online/';
const TAG={PLANE:4001,CYLINDER:4002,CONE:4003,SPHERE:4004,TORUS:4005,B_SURFACE:4006,SWEPT_SURF:4007,OFFSET_SURF:4008,BLEND_BOUND:4009,SPUN_SURF:4010};
const out={};
for(const f of ['2023/2f121983_case.SLDPRT','2024/a4ecc6f5_PP-2074-08.SLDPRT']){
  const d=S.parse(R+f),p=S.readBrep(R+f).parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
  const bodies=p.nodes.filter(n=>n.type===12).map(b=>({idx:b.index,hi:b.values.highest_node_id}));
  const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,tag:TAG[m.get(n.values.surface).name],surf:m.get(n.values.surface).name,body:m.get(n.values.shell).values.body}));
  const rec={bodies:bodies.map(b=>({...b,faces:faces.filter(x=>x.body===b.idx).length})),display:d.faces.length,groups:{}};
  const used=new Set();
  const cls=[];
  d.faces.forEach((x,i)=>{
    const id=x.metadata.rawId,tag=x.metadata.typeTag;
    const direct=faces.map((n,j)=>[n,j]).filter(([n,j])=>n.nid===id&&n.tag===tag&&!used.has(j));
    let g;
    if(direct.length){used.add(direct[0][1]);g='direct body '+direct[0][0].body;}
    else{
      const sh=[];for(const b of bodies.slice(0,-1)){const j=faces.findIndex((n,jj)=>n.nid===id+b.hi&&n.tag===tag&&!used.has(jj));if(j>=0)sh.push([b,j]);}
      if(sh.length){used.add(sh[0][1]);g='shifted by hi('+sh[0][0].idx+')='+sh[0][0].hi+' body '+faces[sh[0][1]].body;}else g='unmatched';
    }
    rec.groups[g]=(rec.groups[g]||0)+1;cls.push(g);
  });
  rec.nativeFacesUnused=faces.length-used.size;
  rec.dupGroups=Object.entries(d.faces.reduce((a,x,i)=>((a[x.metadata.rawId]=a[x.metadata.rawId]||[]).push(i),a),{})).filter(([k,v])=>v.length>1).map(([k,v])=>({rawId:+k,display:v.map(i=>({i,tag:d.faces[i].metadata.typeTag,verts:d.faces[i].vertexCount,offset:d.faces[i].offset,class:cls[i]}))}));
  out[f]=rec;
}
fs.writeFileSync(path.join(__dirname,'bodies.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify(out,null,1));
