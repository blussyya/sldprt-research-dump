const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),e=M.edges.get(+process.argv[3]);let c=e.curve;if(c.type==='trimmed')c=c.basis;
console.log('tol',e.tolerance,'tolerant',e.tolerant,'v',e.v&&e.v.map(v=>JSON.stringify(v).slice(0,200)));
console.log('chart',JSON.stringify(c.chart));
for(const s of c.surfaces){console.log(s.type,s.node,s.type==="blend"?JSON.stringify({bt:s.blendType,range:s.range,sup:s.surfaces.map(x=>x.type+x.node),senses:s.senses,spine:s.spine.type}):"");}
