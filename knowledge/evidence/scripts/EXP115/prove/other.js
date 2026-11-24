// Inspect the 'other' faces: which native loops/edges meet at each degree-4 display vertex.
const fs=require('fs');const S=require('/home/user/solidworks-converters/src');const J=require('/home/user/solidworks-converters/src/brep/display-join');const L=require('./lib');
const root='/home/user/sldprt-research-dump/';
const want=[['test files online/2018/0132519a_102_STEM.SLDPRT',41],['test files online/2022/073482d3_ReducerBox_1_Reducer.SLDPRT',20],['test files online/2023/4803f393_box.SLDPRT',964],['test files online/2024/225c13ed_camholder0deg.SLDPRT',5],['test files online/2025/f0b9a118_Standoff_M3x0.5_37 mm_Male to Female.SLDPRT',15]];
for(const [f,i] of want){
  const buf=fs.readFileSync(root+f);const d=S.parse(buf),M=S.brep.model(S.readBrep(buf).parsed);const jn=J.join(d.faces,M);
  const face=d.faces[i],P=L.prep(face),nf=jn[i].face;
  const nb=new Map();for(const s of P.seg.values())for(const [x,y,id] of [[s.a,s.b],[s.b,s.a]].map(([x,y])=>[x,y,[...s.ids][0]])){if(!nb.has(x))nb.set(x,[]);nb.get(x).push(id);}
  console.log('==',f.replace(/.*\//,''),i,'surface',nf.surface.type,'native loops',nf.loops.map(l=>l.coedges.map(c=>{const e=M.edges.get(c.edge);return e.displayId+(e.v?'('+e.v+')':'(ring)')+c.sense;}).join(' ')).join(' || '));
  for(const [v,ids] of nb)if(ids.length===4)console.log('  deg4',v.slice(0,30),'ids',ids.join(','));
}
