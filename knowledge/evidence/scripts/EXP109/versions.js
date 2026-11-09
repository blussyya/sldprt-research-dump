'use strict';
// File mode (no Block3 / later 0 / later 4 / single-strip only) against _DL_VERSION and _MO_VERSION stream prefixes.
const {S,files}=require('./lib');
const T={};
for(const file of files()){let info;try{info=S.info(file);}catch(e){continue;}
 const dl=(info.streams||[]).map(s=>s.name.match(/^_DL_VERSION_(\d+)/)).filter(Boolean).map(m=>m[1])[0]||'-';
 const mo=(info.streams||[]).map(s=>s.name.match(/^_MO_VERSION_(\d+)/)).filter(Boolean).map(m=>m[1])[0]||'-';
 const d=S.parse(file);const fs_=d.faces.filter(f=>!f.noEdgeTable);
 let mode;
 if(!fs_.length)mode='no edge-table faces';
 else if(!fs_.some(f=>f.block3[0]===1))mode='none';
 else{const later=new Set();fs_.forEach(f=>{if(f.block3[0]===1&&f.stripLengths.length>1)later.add(f.block3[f.stripLengths[0]*2-2]);});mode='flag later={'+[...later].sort()+'}';}
 const k=`DL${dl} MO${mo} ${mode}`;T[k]=(T[k]||0)+1;
 if(mode!=='none')console.log(file.split('/').slice(-2).join('/').slice(0,50).padEnd(52),`DL${dl} MO${mo}`,mode);
}
console.log('---');Object.keys(T).sort().forEach(k=>console.log(k.padEnd(50),T[k]));
