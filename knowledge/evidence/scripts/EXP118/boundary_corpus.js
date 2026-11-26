// EXP-118: after the control-0 fix (EXP-117), how many display faces in the corpus still have no
// boundary cycles, and why. One line per file with any, then totals.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs'),path=require('path');
const roots=process.argv.slice(2),files=[];
const walk=p=>{for(const n of fs.readdirSync(p)){const q=path.join(p,n),st=fs.statSync(q);if(st.isDirectory()){if(!/exports|node_modules/i.test(n))walk(q);}else if(/\.sldprt$/i.test(n))files.push(q);}};
roots.forEach(walk);
let faces=0,err=0;const why={};
for(const f of files){let d;try{d=S.parse(fs.readFileSync(f));}catch(e){console.log('parse failed',f,e.message);continue;}
  const bad=d.faces.filter(x=>x.boundaryError);faces+=d.faces.length;err+=bad.length;
  for(const b of bad){const k=String(b.boundaryError).replace(/\d+/g,'#').slice(0,60);why[k]=(why[k]||0)+1;}
  if(bad.length)console.log(path.basename(f),'faces',d.faces.length,'boundary errors',bad.length,JSON.stringify([...new Set(bad.map(b=>String(b.boundaryError).slice(0,50)))]));}
console.log(`files ${files.length}, faces ${faces}, faces with a boundary error ${err}`,JSON.stringify(why));
