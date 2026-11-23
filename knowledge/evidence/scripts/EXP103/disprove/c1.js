const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const cnt={};let tol=0,tolsp=0;const rows=[];
for(const e of M.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;const k=c.type+(c.type==='spcurve'?':'+c.surface.type:'');cnt[k]=(cnt[k]||0)+1;
  if(c.type==='spcurve'){rows.push({id:e.id,tolerant:e.tolerant,tol:e.tolerance,surf:c.surface.type,nodes:c.surface.node});if(e.tolerant)tolsp++;}}
console.log(cnt,'spcurve tolerant',tolsp);
const blendNodes=new Set(rows.filter(r=>r.surf==='blend').map(r=>r.nodes));console.log('distinct blend surfaces under spcurves',blendNodes.size,'edges',rows.filter(r=>r.surf==='blend').length);
console.log(rows.filter(r=>r.surf!=='blend').length,'non-blend spcurve edges');
require('fs').writeFileSync('spcurve-edges.json',JSON.stringify(rows));
