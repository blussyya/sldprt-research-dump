'use strict';
// Scan 13: literal wording check. The three words "after the normals array" read literally (at normals end) vs after scalarFlag and scalar arrays.
// Also count claimed-value records exactly.
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const C={};const add=k=>C[k]=(C[k]||0)+1;
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  for(const face of d.faces){
    const t=tail(L.dl,face);if(!t.ok)continue;
    const lit=[0,4,8].map(k=>L.dl.readUInt32LE(t.nrmEnd+k));
    const cls=face.metadata?'good':'refused';
    add(cls+' scalarFlag='+t.scalarFlag);
    add(cls+' literal-words-nonzero='+lit.some(x=>x)+' (scalarFlag='+t.scalarFlag+')');
    add(cls+' proper-words-nonzero='+t.words.some(x=>x));
  }
}
Object.keys(C).sort().forEach(k=>console.log(String(C[k]).padStart(6),k));
