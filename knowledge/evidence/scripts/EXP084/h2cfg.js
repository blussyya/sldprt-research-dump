const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),X=require(R+'parasolid/xt'),fs=require('fs');
const score=(a,b)=>{let p=0;while(p<a.length&&p<b.length&&a[p]===b[p])p++;let s=0;while(s<a.length-p&&s<b.length-p&&a[a.length-1-s]===b[b.length-1-s])s++;return (p+s)/Math.max(a.length,b.length);};
for(const f of process.argv.slice(2)){const s=P.streams(fs.readFileSync(f));const h=s.Header2;
  const sc=Object.keys(s).filter(k=>/^Contents\/Config-\d+$/.test(k)).map(k=>{const n=+/(\d+)$/.exec(k)[1];let faces='?';try{faces=X.parse(P.sections(s['Contents/Config-'+n+'-Partition'],0).out[0].body,true).nodes.filter(x=>x.type===14).length}catch{}return [n,score(s[k],h),s[k].length,faces];}).sort((a,b)=>b[1]-a[1]);
  console.log(f.split('/').pop().slice(0,26),'H2',h.length,sc.slice(0,4).map(([n,v,l,fc])=>`N=${n}:${v.toFixed(3)}(${l}b,${fc}f)`).join(' '));}
