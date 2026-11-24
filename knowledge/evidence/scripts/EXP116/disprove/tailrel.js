const L=require('./lib'),R=require('./rec');
const fs=require('fs');
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  const pts=[];
  for(const fc of r.faces){const G=fc.geometryEnd,rf=R.readFace(m,G);if(rf.lay!=='C'||!rf.w||rf.w.err)continue;
    const v=m.u(G+100);pts.push({id:rf.w.id,hi:v>>>16,lo:v&0xffff,u96:m.u(G+96)});}
  if(!pts.length)continue;
  // how many distinct (hi-2*id) values, lo values
  const d=new Map(),lo=new Map();for(const p of pts){const k=p.hi-2*p.id;d.set(k,(d.get(k)||0)+1);lo.set(p.lo,(lo.get(p.lo)||0)+1);}
  const top=[...d.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
  console.log(f.split('/').pop().slice(0,40),'n',pts.length,'distinct hi-2id',d.size,'top',JSON.stringify(top),'distinct lo',lo.size,'u96 vals',[...new Set(pts.map(p=>p.u96))].slice(0,4));
}
