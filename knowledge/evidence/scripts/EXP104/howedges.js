'use strict';
/* Of the faces the join resolved by type or geometry, how many does the independent edge-id check also confirm? */
const C=require('./common');const J=require(C.SRC+'/brep/display-join');const fs=require('fs');
const t={};
for(const f of C.corpusFiles()){const L=C.load(f);if(!L.display)continue;
  J.join(L.display,L.M).forEach((r,i)=>{if(!r.face)return;const e=C.edgeIds(L.M,L.display[i],r.face)||'none';const k=r.how+' / edges '+e;t[k]=(t[k]||0)+1;});}
fs.writeFileSync('howedges.json',JSON.stringify(t,null,1));console.log(t);
