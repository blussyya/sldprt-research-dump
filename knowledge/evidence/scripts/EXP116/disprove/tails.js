const L=require('./lib'),R=require('./rec');
const hex=(m,o,n)=>{let s='';for(let i=0;i<n;i+=4)s+=(m.u(o+i)>>>0).toString(16).padStart(8,'0')+' ';return s;};
for(const f of ['test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT','test files online/2025/e8f16581_Engine Base.SLDPRT','test files online/2024/4febfc67_6344149.SLDPRT']){
 const x=L.dlBytes(L.ROOT+'/'+f),r=L.faces(x.dl),m=L.mk(x.dl);
 console.log(f);
 r.faces.slice(0,4).forEach(fc=>{const G=fc.geometryEnd,rf=R.readFace(m,G);
  const start=rf.lay==='B'?100:92;
  console.log(rf.lay,'id',rf.w&&rf.w.id,'tag',rf.w&&rf.w.tag,'tail@'+start+':',hex(m,G+start,(rf.lay==='B'?140:132)-start));});
}
