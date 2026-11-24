const L=require('./lib'),R=require('./rec');
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  r.faces.forEach((fc,i)=>{const rf=R.readFace(m,fc.geometryEnd);
    if(rf.lay!=='C'||!rf.w)return;
    const b1=[...new Set(fc.edgeAnnotations.map(e=>e.id).filter(v=>v!==0))].sort((a,b)=>a-b);
    const ids=[...new Set(rf.w.edges.map(e=>e[0]))].sort((a,b)=>a-b);
    if(JSON.stringify(b1)!==JSON.stringify(ids))console.log(f.split('/').pop(),i,'id',rf.w.id,'tag',rf.w.tag,'cnt',rf.w.count,'b1',JSON.stringify(b1).slice(0,80),'rec',JSON.stringify(ids).slice(0,80));
  });
}
