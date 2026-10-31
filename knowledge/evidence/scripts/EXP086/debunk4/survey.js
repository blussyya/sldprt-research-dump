const R=process.argv[2], file=process.argv[3];
const S=require(R+'/src'), N=require(R+'/src/brep/native');
const M=N.build(S.readBrep(file).parsed);
const rows=[];
const cnt={};
for(const e of M.edges.values()){
  let c=e.curve; if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection')continue;
  const [A,B]=c.surfaces;
  const bb=A.type==='blendBound'||B.type==='blendBound';
  const kind=bb?'contact':'inter';
  const sp=bb?(()=>{const b=(A.type==='blendBound'?A:B).blend;let s=b.spine;if(s.type==='trimmed')s=s.basis;return s.type;})():'';
  const key=kind+':'+A.type+'/'+B.type+(sp?':spine='+sp:'');
  cnt[key]=(cnt[key]||0)+1;
  const vt=e.v?e.v.map(v=>M.vertices.get(v).tolerance):null;
  rows.push({id:e.id,kind,key,v:e.v,vt,tol:e.tolerance,tolerant:e.tolerant});
}
console.log(M.edges.size,'edges',M.vertices.size,'vertices');
console.log(cnt);
const tv=[...M.vertices.values()].filter(v=>v.tolerance);
console.log('tolerant vertices',tv.length, tv.map(v=>v.id+':'+v.tolerance).join(' '));
console.log('tolerant edges among them',rows.filter(r=>r.tolerance).length);
require('fs').writeFileSync(process.argv[4],JSON.stringify(rows));
