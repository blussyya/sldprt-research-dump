'use strict';
// Inside the 27 files, first-control byte per display tag (files with readable metadata only), to see which tags are never flagged.
const {S,files}=require('./lib');const F={};
for(const file of files()){const d=S.parse(file);const fs_=d.faces.filter(f=>!f.noEdgeTable);if(!fs_.some(f=>f.block3[0]===1))continue;
 for(const f of fs_){if(!f.metadata)continue;const t=f.metadata.typeTag;(F[t]??={})[f.block3[0]]=((F[t]??={})[f.block3[0]]||0)+1;}}
console.log(JSON.stringify(F));
