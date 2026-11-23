'use strict';
// Scan 5: shift hypothesis. For every record, look for any u32 in 4001..4010 between geometryEnd+132 and the next record,
// report its offset relative to the 3-word position. Control = records the reader accepts (must give +40 only).
const {walk,load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const G={},B={},N={};let nb=0,ng=0,noTag=0,noTagF={};
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  d.faces.forEach((face,i)=>{
    const t=tail(L.dl,face);if(!t.ok)return;
    const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length;const hits=[];
    for(let o=t.wordsAt;o+4<=end;o+=1){const v=L.dl.readUInt32LE(o);if(v>=4001&&v<=4010)hits.push(o-t.wordsAt);}
    const tgt=face.metadata?G:B;if(face.metadata)ng++;else nb++;
    if(!hits.length&&!face.metadata){noTag++;const k=f.split('/').pop().slice(0,20);noTagF[k]=(noTagF[k]||0)+1;}
    for(const h of new Set(hits.slice(0,3)))tgt[h]=(tgt[h]||0)+1;
  });
}
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e.join(':')).join(' ');
console.log('good records',ng,'offsets(rel to words) of any 4001-4010 u32:',top(G));
console.log('bad records',nb,'offsets:',top(B));
console.log('bad records with NO 4001-4010 u32 anywhere after words:',noTag,JSON.stringify(noTagF));
