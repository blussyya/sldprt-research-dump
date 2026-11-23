'use strict';
// Scan 3: per file, the 994 records the reader refuses: word patterns, tag values, scalarFlag.
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
for(const f of files){
  const L=load(f);if(!L)continue;
  const d=display.extractDisplayLists(L.dl,false);const W={},T={},SF={};let n=0,tot=d.faces.length;
  for(const face of d.faces){if(face.metadata)continue;if(!/no id block/.test(face.metadataError||''))continue;
    const t=tail(L.dl,face);n++;const w=t.words.join('/');W[w]=(W[w]||0)+1;T[t.tag]=(T[t.tag]||0)+1;SF[t.scalarFlag]=(SF[t.scalarFlag]||0)+1;}
  if(n)console.log(f.replace(R,'').split('/').slice(-2).join('/').slice(0,48).padEnd(48),'bad',n,'/',tot,'words',JSON.stringify(W).slice(0,110),'tags',JSON.stringify(T).slice(0,90),'sf',JSON.stringify(SF));
}
