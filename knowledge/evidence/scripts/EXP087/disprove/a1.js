const fs=require('fs');
const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native'),
F=require(R+'/src/brep/fit'), G=require(R+'/src/geom/eval');
const file=fs.readdirSync('/home/user/sldprt-research-dump/test files online').map(d=>'/home/user/sldprt-research-dump/test files online/'+d+'/82981f2a_head_back.sldprt').find(fs.existsSync);
const M=N.build(S.readBrep(file).parsed).faces?N.build(S.readBrep(file).parsed):0; const B=M;
const f=[...M.faces.values()].find(x=>x.id===2478||x.face===2478)||[...M.faces.entries()].slice(0,1); console.log(M.faces.constructor.name, [...M.faces.keys()].slice(0,5), Object.keys([...M.faces.values()][0]));
const b=f.surface; const c=b.spine.type==='trimmed'?b.spine.basis:b.spine;
console.log(b.type,c.type,c.surfaces.map(s=>s.type+' '+(s.basis?s.basis.type+' d='+s.d+' sense='+s.basis.sense:'')), b.surfaces.map(s=>s.type), c.start.p,c.end.p,c.chart.length);
