const R='/home/user/solidworks-converters', S=require(R+'/src'), N=require(R+'/src/brep/native');
const file=require('child_process').execSync("ls '/home/user/sldprt-research-dump/test files online/'*/82981f2a_head_back.sldprt").toString().trim();
const M=N.build(S.readBrep(file).parsed);
const f=M.faces.find(x=>x.id===2478), b=f.surface;
const sm=(s,d=0)=>{ if(!s||typeof s!=='object')return s; const o={};for(const k in s){const v=s[k]; if(Array.isArray(v)&&v.length>6)o[k]='['+v.length+']'; else if(v&&typeof v==='object'&&!Array.isArray(v)&&d<3)o[k]=sm(v,d+1); else if(Array.isArray(v))o[k]=v.map(x=>sm(x,d+1)); else o[k]=v;} return o;};
console.log(JSON.stringify(sm({spine:b.spine,surfaces:b.surfaces}),null,0).slice(0,5000));
