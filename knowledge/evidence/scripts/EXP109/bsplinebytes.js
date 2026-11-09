'use strict';
// Edge-use byte histogram per display surface tag, and the flag (first control) per tag, over the files whose metadata reads.
const {S,files}=require('./lib');
const H={},F={};
for(const file of files()){const d=S.parse(file);
 for(const f of d.faces){if(f.noEdgeTable||!f.metadata)continue;const tag=f.metadata.typeTag;const fl=f.block3[0];
  (F[tag]??={})[fl]=((F[tag]??={})[fl]||0)+1;
  if(!fl)continue;
  f.edgeAnnotations.forEach(a=>{if(!a.id)return;const b=f.block3[(a.tokenOffset-f.offsets.block1-16)/4];(H[tag]??={})[b]=((H[tag]??={})[b]||0)+1;});
 }}
console.log('first-control byte per tag (all files with readable metadata):',JSON.stringify(F));
console.log('edge-label bytes on flagged faces per tag:',JSON.stringify(H));
