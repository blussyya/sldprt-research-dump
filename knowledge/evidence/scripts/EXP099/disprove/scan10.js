'use strict';
// Scan 10: the 4622 records where the reader's metadata fails at the first array header (not "no id block").
// Where is a 4001-4010 u32, relative to geometryEnd+132? Control: accepted records, where it must be at one fixed offset.
const {walk,load,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const bad={},none={},ctl={};let nb=0,nbNone=0,ng=0;const pf={};
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  d.faces.forEach((face,i)=>{
    const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length,s=face.geometryEnd+132;
    const hits=[];for(let o=s;o+4<=end;o++){const v=L.dl.readUInt32LE(o);if(v>=4001&&v<=4010)hits.push(o-s);}
    if(face.metadata){ng++;ctl[hits[0]]=(ctl[hits[0]]||0)+1;return;}
    if(!/Unexpected array header/.test(face.metadataError||''))return;
    nb++;const k=f.split('/').pop().slice(0,22);pf[k]=(pf[k]||0)+1;
    if(!hits.length){nbNone++;return;}bad[hits[0]]=(bad[hits[0]]||0)+1;
  });
}
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e.join(':')).join(' ');
console.log('control (accepted',ng,') first 4001-4010 offset from geometryEnd+132:',top(ctl));
console.log('array-header failures',nb,'in',Object.keys(pf).length,'parts; with NO 4001-4010 u32:',nbNone,'; first-hit offsets:',top(bad));
console.log(JSON.stringify(pf));
