const S=require('/home/user/solidworks-converters/src');const nat=require('/home/user/solidworks-converters/src/brep/native');
const f=process.argv[2];
const r=S.readBrep(f);const M=nat.build(r.parsed);
console.log(Object.keys(M));console.log('faces',M.faces.length,'bodies',M.bodies&&M.bodies.length,'sections',r.parsed.sections);
console.log(JSON.stringify(M.faces[0],(k,v)=>k==='surface'?{type:v.type}:v,0).slice(0,500));
if(M.bodies)console.log(JSON.stringify(M.bodies[0]).slice(0,400));
