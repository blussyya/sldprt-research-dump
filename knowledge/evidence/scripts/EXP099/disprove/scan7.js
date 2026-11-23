'use strict';
// Scan 7: classify the 994 refused records by tail content, and list duplicate rawId groups per part (records with a real id block).
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const dup=[];let parts=0;
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  const cls={short:0,text:0,other:0};const ids={};let withId=0;
  d.faces.forEach((face,i)=>{
    const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length;
    if(face.metadata){withId++;const k=face.metadata.rawId;(ids[k]=ids[k]||[]).push(i);return;}
    if(!/no id block/.test(face.metadataError||''))return;
    const t=tail(L.dl,face);const tl=end-t.wordsAt;
    if(tl<=60)cls.short++;else if(L.dl.slice(t.wordsAt,end).includes(Buffer.from('\0\0\0\0\0\0\0\0'))&&tl>100)cls.text++;else cls.other++;
  });
  const g=Object.entries(ids).filter(e=>e[1].length>1);
  if(cls.short||cls.text||cls.other)console.log('REFUSED',f.split('/').pop().slice(0,40),JSON.stringify(cls));
  if(g.length){parts++;dup.push([f.replace(R,''),withId,g.length,g.reduce((s,e)=>s+e[1].length,0),Math.max(...g.map(e=>e[1].length))]);}
}
console.log('parts with duplicate rawId among faces having a real id block:',parts);
dup.forEach(r=>console.log(r.join(' | ')));
