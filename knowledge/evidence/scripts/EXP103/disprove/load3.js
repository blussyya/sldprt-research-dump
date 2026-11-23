const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const fs=Array.isArray(M.faces)?M.faces:[...M.faces.values()];console.log(fs.length,Object.keys(fs[0]));
const hit=fs.filter(F=>JSON.stringify(F,(k,v)=>k==='surface'||k==='curve'?undefined:v).match(/\b844\b/));
for(const F of hit){console.log(F.id,Object.keys(F),F.surface&&F.surface.type,JSON.stringify(F.loops||F.coedges).slice(0,300));}
const e=M.edges.get(844);console.log(e.pcurves.map(p=>[p.face,Object.keys(p)]));
