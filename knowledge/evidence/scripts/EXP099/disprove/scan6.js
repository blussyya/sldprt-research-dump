'use strict';
// Scan 6: what follows the three words in the refused records. Hex + UTF-16 / ASCII view, one example per word pattern per part.
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online')].filter(f=>!/not-a-part/.test(f));
const u16=b=>{let s='';for(let i=0;i+1<b.length;i+=2){const c=b.readUInt16LE(i);s+=(c>=32&&c<127)?String.fromCharCode(c):'.';}return s;};
const a8=b=>[...b].map(c=>c>=32&&c<127?String.fromCharCode(c):'.').join('');
const cls={};
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  d.faces.forEach((face,i)=>{if(face.metadata||!/no id block/.test(face.metadataError||''))return;
    const t=tail(L.dl,face);const k=t.words.join('/')+'@'+f.split('/').pop().slice(0,12);if(cls[k])return;cls[k]=1;
    const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length;const b=L.dl.slice(t.wordsAt,Math.min(end,t.wordsAt+160));
    console.log('==',k,'rec',face.offset,'tailbytes',end-t.wordsAt);console.log(' hex ',b.slice(0,64).toString('hex'));console.log(' u16 ',u16(b.slice(12,140)));console.log(' a8  ',a8(b.slice(12,140)));});
}
