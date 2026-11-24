const fs=require('fs');const L=require('./lib'),R=require('./rec');
const out=[];
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}
  if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  r.faces.forEach((fc,i)=>{
    const G=fc.geometryEnd;const rf=R.readFace(m,G);
    const nxt=r.faces[i+1]?r.faces[i+1].offset:x.dl.length;
    const b1ids=[...new Set(fc.edgeAnnotations.map(e=>e.id).filter(v=>v!==0))].sort((a,b)=>a-b);
    out.push({sk:rf.w&&rf.w.sk,file:f.replace(L.ROOT+'/',''),ver:x.ver,i,G,nxt,vc:fc.vertexCount,lay:rf.lay,u128:rf.u128,w:rf.w,b1ids});
  });
}
fs.writeFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/recs.json',JSON.stringify(out));
console.log('records',out.length);
