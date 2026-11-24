// Independent join: display face Block1 edge-id set vs native face edge displayId set. Compare to the id join.
const fs=require('fs');const L=require('./lib'),R=require('./rec');
const res=[];const Bout=[];
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  let M;try{M=L.S.brep.model(L.S.readBrep(f).parsed);}catch(e){continue;}
  const key=s=>[...s].sort((a,b)=>a-b).join(',');
  const nset=new Map();  // edge set key -> faces
  for(const nf of M.faces){const s=new Set();for(const l of nf.loops||[])for(const c of l.coedges||[]){const e=M.edges.get(c.edge);if(e)s.add(e.displayId);}
    const k=key(s);if(!s.size)continue;(nset.get(k)||nset.set(k,[]).get(k)).push(nf);}
  const byId=new Map();for(const nf of M.faces)(byId.get(nf.displayId)||byId.set(nf.displayId,[]).get(nf.displayId)).push(nf);
  r.faces.forEach((fc,i)=>{const rf=R.readFace(m,fc.geometryEnd);
    const s=new Set(fc.edgeAnnotations.map(e=>e.id).filter(v=>v!==0));
    const c=s.size?(nset.get(key(s))||[]):null;
    const row={file:f.split('/').pop(),lay:rf.lay,nedge:s.size,ecand:c?c.length:null};
    if(rf.w&&!rf.w.err&&rf.w.res.every(v=>v===0)&&rf.w.tag>=4001&&rf.w.tag<=4010){
      const ic=byId.get(rf.w.id)||[];row.idcand=ic.length;
      row.agree=c&&c.length>=1?c.some(n=>ic.includes(n)):null;
      row.edgeUniqueAgree=c&&c.length===1?ic.includes(c[0]):null;
    }
    if(rf.lay==='B'&&c&&c.length===1)Bout.push({file:f,i,G:fc.geometryEnd,nid:c[0].displayId,type:c[0].surface.type});
    res.push(row);});
}
fs.writeFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/bjoin.json',JSON.stringify(Bout));
for(const g of ['A','C','B']){const R_=res.filter(r=>r.lay===g);
  const eu=R_.filter(r=>r.ecand===1),ei=eu.filter(r=>r.edgeUniqueAgree!==undefined&&r.edgeUniqueAgree!==null);
  console.log(g,JSON.stringify({faces:R_.length,noEdges:R_.filter(r=>r.ecand===null).length,edgeNone:R_.filter(r=>r.ecand===0).length,edgeUnique:eu.length,edgeMulti:R_.filter(r=>r.ecand>1).length,
   uniqueEdgeAndIdBlock:ei.length,idJoinContainsEdgeFace:ei.filter(r=>r.edgeUniqueAgree).length,idJoinMissesEdgeFace:ei.filter(r=>!r.edgeUniqueAgree).length}));}
