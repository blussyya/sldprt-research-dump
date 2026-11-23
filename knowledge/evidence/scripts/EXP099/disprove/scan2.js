'use strict';
// Scan 2: cross-tab reader outcome (f.metadata present / error text) against my own words and tag.
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const X={};let nf=0,nface=0;
for(const f of files){
  const L=load(f);if(!L)continue;nf++;
  const d=display.extractDisplayLists(L.dl,false);
  for(const face of d.faces){
    nface++;const t=tail(L.dl,face);
    const rd=face.metadata?'meta':('err:'+face.metadataError.replace(/[0-9,]+/g,'#'));
    const mine=!t.ok?'noparse':(t.words.some(x=>x)?'wordsNZ':'wordsZero')+'/'+((t.tag>=4001&&t.tag<=4010)?'tagOK':'tagBAD');
    const k=rd+' | '+mine;(X[k]=X[k]||{n:0,files:{}});X[k].n++;const b=f.replace(R,'').split('/').pop().slice(0,24);X[k].files[b]=(X[k].files[b]||0)+1;
  }
}
console.log('files',nf,'faces',nface);
for(const [k,v] of Object.entries(X))console.log(v.n,k,'  files:',Object.entries(v.files).slice(0,6).map(e=>e.join('x')).join(' '),Object.keys(v.files).length>6?'...('+Object.keys(v.files).length+')':'');
