const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),M=require(R+'container/modern'),fs=require('fs');
const files=fs.readFileSync(0,'utf8').trim().split('\n');const out={};
const score=(a,b)=>{let p=0;while(p<a.length&&p<b.length&&a[p]===b[p])p++;let s=0;while(s<a.length-p&&s<b.length-p&&a[a.length-1-s]===b[b.length-1-s])s++;return (p+s)/Math.max(a.length,b.length);};
for(const f of files){let raw;try{raw=fs.readFileSync(f);}catch{continue}if(M.isOLE2(raw))continue;let s;try{s=P.streams(raw);}catch{continue}
  if(!s.Header2)continue;const h=s.Header2;
  const sc=Object.keys(s).filter(k=>/Config-\d+-ModelHeader$/.test(k)).map(k=>[+/Config-(\d+)-/.exec(k)[1],score(s[k],h)]).sort((a,b)=>b[1]-a[1]);
  if(!sc.length){(out['no ModelHeader']=out['no ModelHeader']||[]).push(f.split('/').pop().slice(0,22)+' '+Object.keys(s).filter(k=>/Config/.test(k)).join(','));continue;}
  const parts=Object.keys(s).filter(k=>/Config-\d+-Partition$/.test(k)).length;
  const k=(sc.length>1?'multi':'single')+(sc[0][1]<0.9?' WEAK':'')+(sc.length>1&&sc[1][1]>0.9?' AMBIG':'');
  (out[k]=out[k]||[]).push(f.split('/').pop().slice(0,22)+' '+sc.slice(0,3).map(([n,v])=>n+'='+v.toFixed(3)).join(' ')+' parts='+parts);}
for(const [k,v] of Object.entries(out))console.log(k,v.length,'\n   '+v.filter((_,i)=>k!=='single'||i<5).join('\n   '));
