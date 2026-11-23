'use strict';
// Scan 12: the 190 records neither layout parses, and the 6 "1/96/2" records. Print parts and a hex peek.
const {walk,load,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/';
const files=[...walk(R+'test files online')].filter(f=>!/not-a-part/.test(f));
const C={};
for(const f of files){
  const L=load(f);if(!L)continue;const d=display.extractDisplayLists(L.dl,false);
  d.faces.forEach((face,i)=>{
    if(!/Unexpected array header/.test(face.metadataError||''))return;
    const s=face.geometryEnd+132;const end=d.faces[i+1]?d.faces[i+1].offset:L.dl.length;
    const u=x=>L.dl.readUInt32LE(x);
    // variant: flag, arr12 at s+4
    const h=[0,4,8,12].map(k=>u(s+4+k));if(h[0]===12&&h[1]===100&&h[2]===2)return;
    const k=f.split('/').pop().slice(0,22);C[k]=C[k]||{n:0,ex:null};C[k].n++;
    if(!C[k].ex)C[k].ex={off:face.offset,gEnd:face.geometryEnd,recLen:end-s,hex:L.dl.slice(s,s+72).toString('hex')};
  });
}
for(const [k,v] of Object.entries(C))console.log(k,v.n,JSON.stringify(v.ex));
