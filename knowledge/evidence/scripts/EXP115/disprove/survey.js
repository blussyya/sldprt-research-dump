const {S,files,simple}=require('./lib');
const rows=[];let tot=0,faces=0,noTable=0,bad=0;
for(const p of files()){
  let d;try{d=S.parse(p);}catch(e){console.log('ERR',p,e.message);continue;}
  const legacy=/OLE/.test(d.format);
  let fb=0,nf=0,nt=0,segdup=0;const kinds={};
  for(const f of d.faces){
    if(f.noEdgeTable){nt++;continue;}
    nf++;
    const {adj,seg}=simple(f);
    for(const s of seg.values())if(s.n>1)segdup++;
    const degs=[...adj.values()].map(x=>x.length);
    if(degs.some(x=>x!==2)){fb++;const k=[...new Set(degs)].sort().join('/');kinds[k]=(kinds[k]||0)+1;}
  }
  rows.push({p:p.replace(/.*test files /,''),legacy,faces:d.faces.length,withTable:nf,noTable:nt,bad:fb,kinds});
  faces+=nf;noTable+=nt;bad+=fb;
}
for(const r of rows)if(r.bad||r.noTable)console.log(JSON.stringify(r));
console.log('files',rows.length,'facesWithTable',faces,'noTable',noTable,'bad',bad);
const m=rows.filter(r=>!r.legacy).reduce((s,r)=>s+r.bad,0),l=rows.filter(r=>r.legacy).reduce((s,r)=>s+r.bad,0);
console.log('modern bad',m,'legacy bad',l);
