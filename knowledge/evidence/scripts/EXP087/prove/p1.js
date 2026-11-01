const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native');
const file=require('child_process').execSync("ls '/home/user/sldprt-research-dump/test files online/'*/82981f2a_head_back.sldprt").toString().trim();
const M=N.build(S.readBrep(file).parsed);
console.log(M.faces.constructor.name, Object.keys(M.faces).length);
const arr=Array.isArray(M.faces)?M.faces:Object.values(M.faces);
const f=arr.find(x=>x.id===2478); console.log(f&&f.id);
const cir=new Set();
const s=f.surface;
console.log(JSON.stringify(s,(k,v)=>{if(v&&typeof v==='object'){if(cir.has(v))return '[cyc]';cir.add(v)}return Array.isArray(v)&&v.length>6&&typeof v[0]==='number'?'[..'+v.length+']':v}).slice(0,4000));
