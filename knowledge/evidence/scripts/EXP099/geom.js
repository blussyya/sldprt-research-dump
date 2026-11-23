#!/usr/bin/env node
'use strict';
/* EXP-099 step 8: geometry check of the pairs. For each display face that shares a rawId, measure how far its
 * mesh vertices lie from the surface of (a) the B-rep face it was matched to and (b) the other face with that
 * (stored or shifted) id. Plane: |n.(v-p)|. Cylinder: | dist(v, axis) - r |. Cone: | dist(v, axis) - (r + t*tan(a)) |,
 * t = axial coordinate from p. Bar: 1e-6 m (mesh vertices come from float32 metres, so ~1e-7 is the floor). Writes geom.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const R='/home/user/sldprt-research-dump/test files online/';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function dev(s,v){
  if(s.type==='plane')return Math.abs(dot(s.n,sub(v,s.p)));
  if(s.type==='cylinder'||s.type==='cone'){const q=sub(v,s.p),t=dot(q,s.a),perp=Math.hypot(...q.map((x,i)=>x-t*s.a[i]));const r=s.type==='cone'?s.r+t*Math.tan(s.angle):s.r;return Math.abs(perp-r);}
  return NaN;
}
function worst(face,s){let m=0;for(let i=0;i<face.vertexCount;i++){const e=dev(s,[face.vertices[3*i],face.vertices[3*i+1],face.vertices[3*i+2]]);if(!(e<=m))m=Number.isNaN(e)?NaN:e;if(Number.isNaN(m))return NaN;}return m;}
const out={};
for(const [rel,groups] of [['2023/2f121983_case.SLDPRT',[253]],['2024/a4ecc6f5_PP-2074-08.SLDPRT',[2,31,228]]]){
  const f=R+rel,d=S.parse(f),p=S.readBrep(f).parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
  const M=S.brep.model(p); // converter's own faces, with its renumbered ids
  // raw per-body faces
  const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,body:m.get(n.values.shell).values.body,idx:n.index}));
  const bodyIdx=[...new Set(faces.map(x=>x.body))].sort((a,b)=>a-b);
  const nodeFace=new Map();// node index -> converter face
  const byIdxFaces=p.nodes.filter(n=>n.type===14);byIdxFaces.forEach((n,i)=>nodeFace.set(n.index,M.faces[i]));
  out[rel]=[];
  for(const g of groups){
    const members=d.faces.map((x,i)=>[x,i]).filter(([x])=>x.metadata.rawId===g);
    // candidate native faces: stored id g in any body, or g + shift of the later body
    const cands=faces.filter(x=>x.nid===g||x.nid===g+53508*(rel.startsWith('2024')?1:0));
    for(const [x,i] of members){
      const row={rawId:g,displayFace:i,tag:x.metadata.typeTag,verts:x.vertexCount,vs:[]};
      for(const c of cands){const s=nodeFace.get(c.idx).surface;row.vs.push({body:c.body,nodeIdInConverter:c.nid,surface:s.type,maxDevM:worst(x,s)});}
      out[rel].push(row);
    }
  }
}
fs.writeFileSync(path.join(__dirname,'geom.json'),JSON.stringify(out,null,1)+'\n');
for(const k in out)for(const r of out[k])console.log(k.split('/')[1].slice(0,10),r.rawId,'disp#'+r.displayFace,r.tag,r.verts+'v',r.vs.map(v=>`${v.surface}/body${v.body}(id ${v.nodeIdInConverter}): ${v.maxDevM.toExponential(1)}`).join('  '));
