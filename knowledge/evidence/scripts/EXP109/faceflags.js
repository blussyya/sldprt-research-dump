'use strict';
// Flagged faces (first control byte 1): what do the edge bytes, surface tag and strip count say about later-control 4?
const {S,files,strips}=require('./lib');
const T={};const add=(k)=>T[k]=(T[k]||0)+1;
const rows=[];
for(const file of files()){const d=S.parse(file);
 for(const [fi,f] of d.faces.entries()){if(f.noEdgeTable)continue;const st=strips(f);
  const first=st[0].b3ctl;if(!first){ // unflagged: do edge bytes exist?
    const eb=new Set();st.forEach(x=>x.b3labels.forEach(b=>b&&eb.add(b)));add('unflagged edgebytes='+[...eb]);continue;}
  const later=st.length>1?st[1].b3ctl:'-';
  const eb=new Set();st.forEach(x=>x.b3labels.forEach(b=>b&&eb.add(b)));
  const ebs=[...eb].sort().join('')||'none';
  const tag=f.metadata?f.metadata.typeTag:'nometa';
  add(`flagged later=${later} edgebytes=${ebs}`);
  rows.push({file:file.split('/').slice(-2).join('/'),fi,strips:st.length,later,ebs,tag,vc:f.vertexCount,ne:f.metadata?f.metadata.edgeRecords.length:null});
 }}
console.log(JSON.stringify(T,null,1));
const g={};rows.forEach(r=>{const k=`later=${r.later} tag=${r.tag}`;g[k]=(g[k]||0)+1;});console.log(JSON.stringify(g,null,1));
require('fs').writeFileSync('flagged.json',JSON.stringify(rows));
