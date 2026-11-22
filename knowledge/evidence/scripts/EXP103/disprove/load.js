const R=process.argv[2]||'/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
console.time('load');const M=N.build(S.readBrep(f).parsed);console.timeEnd('load');
const e=M.edges.get(844);console.log(Object.keys(e));console.log(JSON.stringify(e,(k,v)=>Array.isArray(v)&&v.length>6?'[arr'+v.length+']':v).slice(0,1500));
console.log('faces',M.faces.size);
