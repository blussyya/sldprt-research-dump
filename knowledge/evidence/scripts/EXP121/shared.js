// EXP-121: blend surfaces shared by two faces. Fit the blend once per face (as the resolve would if
// that face came first) and compare the spine ranges (uRange) each fit covers.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),out=m=>fs.writeSync(1,m+'\n');
const groups=new Map();for(const f of M.faces){if(f.surface.type!=='blend')continue;if(!groups.has(f.surface))groups.set(f.surface,[]);groups.get(f.surface).push(f);}
const shared=[...groups].filter(([s,fs])=>fs.length>1);
out(`blend surfaces ${groups.size}, shared by more than one face ${shared.length}: ${shared.map(([s,fs])=>'blend'+s.node+' ('+fs.map(f=>f.id).join(',')+')').join(' ')}`);
const want=process.argv.slice(3).map(Number);
for(const [s,fs2] of shared){if(want.length&&!want.includes(s.node))continue;
  for(const f of fs2){const t=Date.now();try{const r=F.blendSurface(s,f,M,{tolerance:1e-8});out(`blend${s.node} fitted for face ${f.id}: spine range ${r.uRange.map(x=>x.toPrecision(8)).join(' .. ')}, error ${r.error.toExponential(2)}, ${((Date.now()-t)/1000).toFixed(0)} s`);}
    catch(e){out(`blend${s.node} face ${f.id}: threw ${e.message}`);}}}
