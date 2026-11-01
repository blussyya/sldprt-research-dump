const fs=require('fs');
const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native'),
F=require(R+'/src/brep/fit'), G=require(R+'/src/geom/eval');
const file=fs.readdirSync('/home/user/sldprt-research-dump/test files online').map(d=>'/home/user/sldprt-research-dump/test files online/'+d+'/82981f2a_head_back.sldprt').find(fs.existsSync);
const M=N.build(S.readBrep(file).parsed);
const f=M.faces.find(x=>x.id===2478);
const b=f.surface, c=b.spine.type==='trimmed'?b.spine.basis:b.spine;
const [S1,S2]=c.surfaces, A=c.start.p,B=c.end.p;
module.exports={F,G,S1,S2,A,B,b,c,fs};
