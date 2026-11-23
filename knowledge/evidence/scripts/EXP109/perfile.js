'use strict';
// Per file: flagged share of faces, metadata errors on flagged faces.
const {S,files}=require('./lib');
const rows=[];const errs={};
for(const file of files()){const d=S.parse(file);let n=0,fl=0,flm=0,unm=0;
 for(const f of d.faces){if(f.noEdgeTable)continue;n++;const flg=f.block3[0]===1;if(flg){fl++;if(!f.metadata){flm++;const e=(f.metadataError||'').replace(/\d+/g,'#');errs[e]=(errs[e]||0)+1;}}}
 if(fl)rows.push({file:file.split('/').slice(-2).join('/'),faces:n,flagged:fl,flaggedNoMeta:flm,rejected:d.rejected.length});}
console.table(rows);console.log(errs);
