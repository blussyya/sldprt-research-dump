// Fit only blend +process.env.NODE's spine (head_back), without resolving the rest of the part.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===+process.env.NODE){b=f.surface;break;}
try{const t=Date.now(),r=F.spineOf(b,1e-8);console.log('spine fitted, error',r.error,'in',(Date.now()-t)/1e3,'s, ctrl',r.curve.ctrl.length);}catch(e){console.log(e.message);}
