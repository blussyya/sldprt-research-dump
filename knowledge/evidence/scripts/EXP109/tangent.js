'use strict';
// Tangent (max normal angle < 0.05 rad) two-sided edges from EXP-088 results, by byte pattern, with native surface/curve types.
const fs=require('fs'),path=require('path');const {S,CORPUS}=require('./lib');
const R=require('/home/user/dump-validation/knowledge/evidence/scripts/EXP088/block3-tangent/results.json');
const rows=R.twoSided.filter(r=>r.maxAngle<0.05);
const byFile={};rows.forEach(r=>(byFile[r.file]??=[]).push(r));
const out=[];const cnt={};
for(const [file,rs] of Object.entries(byFile)){
 const M=S.brep.model(S.readBrep(path.join(CORPUS,file)).parsed);
 const faces=new Map(M.faces.map(f=>[f.id,f]));
 for(const r of rs){const e=M.edges.get(r.edge);
  const ft=r.faces.map(id=>faces.get(id)?.surface?.type||faces.get(id)?.surfaceType||'?');
  const ct=e?(e.curve.type==='trimmed'?e.curve.basis.type:e.curve.type):'?';
  const pat=r.flags.map(a=>a.join('+')).join('/');
  const row={file:file.split('/').pop().slice(0,12),edge:r.edge,pat,ft:ft.slice().sort().join('+'),ct,max:+r.maxAngle.toExponential(2)};
  out.push(row);const k=`${row.file} ${pat} ${row.ft}`;cnt[k]=(cnt[k]||0)+1;}
}
console.log(Object.keys(faces0()||{}).length);
function faces0(){return null;}
console.log(JSON.stringify(cnt,null,1));
fs.writeFileSync('tangent_rows.json',JSON.stringify(out));
