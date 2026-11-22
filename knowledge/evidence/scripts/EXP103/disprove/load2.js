const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);console.log(Object.keys(M));
for(const k of Object.keys(M)){const v=M[k];console.log(k,v&&v.size!==undefined?'Map '+v.size:typeof v);}
const e=M.edges.get(844);console.log('pcurves',JSON.stringify(e.pcurves||null).slice(0,300),'tolerant',e.tolerant,e.tolerance);
for(const v of e.v){const V=M.vertices.get(v);console.log(v,JSON.stringify(V).slice(0,200));}
