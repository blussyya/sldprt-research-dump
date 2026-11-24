// EXP-116: count faces by record layout (A, B, C) after the reader learned B and C.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs');
const tot={files:0,faces:0,meta:0,A:0,B:0,C:0};const per=[];
for(const f of process.argv.slice(2)){let d;try{d=S.parse(fs.readFileSync(f));}catch(e){continue;}tot.files++;
  let c={A:0,B:0,C:0,none:0};for(const x of d.faces){tot.faces++;if(x.metadata){tot.meta++;tot[x.metadata.layout]++;c[x.metadata.layout]++;}else c.none++;}
  if(c.B||c.C)per.push(require('path').basename(f).slice(0,26)+' '+JSON.stringify(c));}
console.log(JSON.stringify(tot));per.forEach(x=>console.log('  ',x));
