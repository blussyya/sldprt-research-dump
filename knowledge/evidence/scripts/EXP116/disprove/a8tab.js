const L=require('./lib'),R=require('./rec');
const T={};const add=(k,v)=>{T[k]=T[k]||{};T[k][v]=(T[k][v]||0)+1;};
let bfail=0,fx=0,cmis=0;const bfiles={};
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  for(const fc of r.faces){const G=fc.geometryEnd,rf=R.readFace(m,G);
    const rad=m.f(G+84),dbl=m.f(G+92);
    const isDbl=Math.abs(dbl-2*rad)<=1e-12*Math.max(1,Math.abs(dbl));
    add(rf.lay+' f64@92==2*f64@84',isDbl);
    if(rf.w&&rf.lay!=='B'){add(rf.lay+' a8 K',rf.w.a8count===undefined?'none':rf.w.a8count);add(rf.lay+' flag',rf.w.flag);}
    if(rf.lay==='B'){add('B u128',m.u(G+128)===0?'0':'nz');bfiles[f.split('/').pop()]=(bfiles[f.split('/').pop()]||0)+1;add('B a8 K',m.hdr(G+140,8,100));add('B flag after a8',m.u(G+140+16+8*m.hdr(G+140,8,100)));}
    if(rf.lay==='A')add('A u128 (head)',m.u(G+128)<1000?m.u(G+128):'big');
  }
}
console.log(JSON.stringify(T,null,1));console.log(bfiles);
