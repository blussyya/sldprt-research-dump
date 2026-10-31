// Fit only blend 6976's spine (head_back), without resolving the rest of the part.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===6976){b=f.surface;break;}
try{const r=F.spineOf(b,1e-8);console.log('spine fitted, error',r.error);}catch(e){console.log(e.message);}
