'use strict';
// In files with both flagged and unflagged faces (and readable metadata), what separates them?
const {S,files,strips}=require('./lib');
const tab={};const add=(k)=>tab[k]=(tab[k]||0)+1;
const per=[];
for(const file of files()){const d=S.parse(file);const fs_=d.faces.filter(f=>!f.noEdgeTable);
 const fl=fs_.filter(f=>f.block3[0]===1).length;if(!fl||fl===fs_.length)continue;
 const rel=file.split('/').slice(-2).join('/');
 for(const f of fs_){const g=f.block3[0]===1?'F':'U';const m=f.metadata;
  const tag=m?m.typeTag:'nometa';
  add(`${g} tag=${tag}`);
  add(`${g} strips=${f.stripLengths.length>1?'multi':'single'}`);
  add(`${g} edges=${f.edgeAnnotations.some(a=>a.id)?'has':'none'}`);
  add(`${g} scalar=${m?m.scalarFlag:'-'}`);
  add(`${g} dim=${m? (m.edgeRecords.length>0?'edgerec':'noedgerec'):'-'}`);
 }
 per.push(rel);}
const keys=Object.keys(tab).sort();for(const k of keys)console.log(k.padEnd(28),tab[k]);
console.log(per);
