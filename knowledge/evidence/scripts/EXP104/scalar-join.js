'use strict';
/* EXP-091 / EXP-097 figure: of the 1,545 faces that carry the two per-vertex float arrays (scalarFlag 1), 941
 * have no native face with the same node_id. Re-measured the way EXP-097 counted it (rawId against the node_id of
 * every FACE node of the body the converter reads), then again with the section-id join.
 * Rows are split by the before result and the after result; "right/wrong/unchecked" is the check from measure.js. */
const C=require('./common');const fs=require('fs');
const J=require(C.SRC+'/brep/display-join');
const BAR=1e-5;
function check(L,df,nf){let a=false;const mr=C.maxResidual(df,nf);if(mr!==null){a=true;if(!(mr<=BAR))return 'wrong';}
  const b=C.inBounds(L.M,df,nf,BAR);if(b!==null){a=true;if(!b)return 'wrong';}return a?'right':'unchecked';}
const t={files:0,faces:0,beforeNoId:0,beforeHasId:0,table:{},perFile:[]};
for(const f of C.corpusFiles()){
  const L=C.load(f);if(!L.display)continue;
  const arr=L.display.filter(d=>d.metadata.scalarFlag===1);if(!arr.length)continue;
  const ids=new Set(L.B.parsed.nodes.filter(n=>n.type===14).map(n=>n.values.node_id));
  const jr=new Map(J.join(L.display,L.M).map((r,i)=>[L.display[i],r]));
  const row={file:C.rel(f),arrays:arr.length,beforeNoId:0,fixed:0};
  t.files++;
  for(const d of arr){
    t.faces++;const had=ids.has(d.metadata.rawId);
    t[had?'beforeHasId':'beforeNoId']++;row[had?'x':'beforeNoId']=(row.beforeNoId+=had?0:1);
    const r=jr.get(d);const after=!r.face?r.how:'joined-'+check(L,d,r.face);
    const key=(had?'idMatched':'noIdMatch')+' -> '+after;t.table[key]=(t.table[key]||0)+1;
    if(!had&&r.face&&after!=='joined-wrong')row.fixed++;
  }
  delete row.x;t.perFile.push(row);
}
fs.writeFileSync('scalar-join.json',JSON.stringify(t,null,1));
console.log(JSON.stringify({files:t.files,faces:t.faces,beforeNoId:t.beforeNoId,beforeHasId:t.beforeHasId,table:t.table},null,1));
for(const r of t.perFile.filter(r=>r.beforeNoId))console.log(r.file.split('/').pop().slice(0,20),r.arrays,'noId',r.beforeNoId,'fixed',r.fixed);
