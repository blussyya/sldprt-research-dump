'use strict';
// Scan 4: the claim's three parts. Tag value counts at my read position, and which faces have the claimed values.
const {load,tail,display}=require('./lib.js');
const R='/home/user/sldprt-research-dump/test files online/';
const P={'0739c559':R+'2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT','7765d286':R+'2019/7765d286_NSJ8L.SLDPRT','eefa906d':R+'2018/eefa906d_plancher Dalle 2020.SLDPRT'};
const want={'0739c559':4980815,'7765d286':16368,'eefa906d':65536};
for(const [k,f] of Object.entries(P)){
  const L=load(f);const d=display.extractDisplayLists(L.dl,false);let hit=0,rows=[];
  d.faces.forEach((face,i)=>{const t=tail(L.dl,face);if(t.tag===want[k]){hit++;}if(i<4||t.tag===want[k]&&hit<3)rows.push([i,face.offset,JSON.stringify(t.words),t.rawId,t.tag,t.count,t.scalarFlag].join(' '));});
  console.log(k,'faces',d.faces.length,'tag==claimed',hit);rows.forEach(r=>console.log('  ',r));
}
