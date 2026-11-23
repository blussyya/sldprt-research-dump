'use strict';
// Scan 1: per face record, own read of the three words after the normals/scalar block, and the id/tag.
const {walk,load,tail,display,iR,iZ}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online'),...walk(R+'test files new/SW2022'),...walk(R+'test files original')].filter(f=>!/not-a-part/.test(f));
const out=[];let tot={faces:0,wordsNZ:0,tagBad:0,both:0,nzGoodTag:0,zeroBadTag:0};
for(const f of files){
  const L=load(f);if(!L){console.log('SKIP',f);continue;}
  const d=display.extractDisplayLists(L.dl,false);
  let c={faces:0,nz:0,bad:0,nzGood:0,zeroBad:0,tags:{},hmmScalar:0};
  for(const face of d.faces){
    const t=tail(L.dl,face);c.faces++;
    if(!t.ok){c.noparse=(c.noparse||0)+1;console.log("NOPARSE",f,face.offset,JSON.stringify(t));continue;}
    const nz=t.words.some(x=>x!==0),bad=!(t.tag>=4001&&t.tag<=4010);
    if(nz)c.nz++;if(bad)c.bad++;if(nz&&!bad){c.nzGood++;console.log('NZ+GOODTAG',f,face.offset,t.words,t.tag);}
    if(!nz&&bad){c.zeroBad++;console.log('ZERO+BADTAG',f,face.offset,t.tag,t.words);}
    if(nz)c.tags[t.tag]=(c.tags[t.tag]||0)+1;
    
  }
  if(c.nz||c.bad||c.hmmScalar)console.log('FILE',f.replace(R,''),JSON.stringify(c),'rejected',d.rejected.length);
  for(const k of ['faces'])tot.faces+=c.faces;tot.wordsNZ+=c.nz;tot.tagBad+=c.bad;tot.nzGood+=c.nzGood;tot.zeroBad+=c.zeroBad;
}
console.log('files',files.length,JSON.stringify(tot));
