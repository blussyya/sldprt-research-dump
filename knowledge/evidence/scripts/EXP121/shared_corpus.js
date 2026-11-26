// EXP-121: parts in the online sample with a blend surface shared by more than one face
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs'),path=require('path');
for(const f of process.argv.slice(2)){let M;try{M=N.build(S.readBrep(fs.readFileSync(f)).parsed);}catch(e){continue;}
  const g=new Map();for(const x of M.faces){if(x.surface.type!=='blend')continue;g.set(x.surface,(g.get(x.surface)||0)+1);}
  const sh=[...g.values()].filter(n=>n>1);if(sh.length)console.log(path.basename(f),'blend surfaces',g.size,'shared',sh.length,'faces on shared',sh.reduce((a,b)=>a+b,0));}
