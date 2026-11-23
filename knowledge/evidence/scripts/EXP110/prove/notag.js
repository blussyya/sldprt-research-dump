// faces with no id/tag block: by file, what u92/u104/u108/u128 look like and what the reader said
const fs=require('fs');const R=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.u92!==undefined&&r.tag==null);
const by={};R.forEach(r=>{const k=r.file.replace(/.*sldprt-research-dump\/test files /,'')+' | '+(r.metaErr||'').replace(/\d+/g,'N').slice(0,34);const o=by[k]=by[k]||{n:0,u128_0:0,u128_1:0,u128_other:0,u92_01:0,u104_1:0};o.n++;if(r.u128===0)o.u128_0++;else if(r.u128===1)o.u128_1++;else o.u128_other++;if(r.u92<2)o.u92_01++;if(r.u104===1)o.u104_1++;});
for(const [k,v] of Object.entries(by).sort((a,b)=>b[1].n-a[1].n))console.log(k,JSON.stringify(v));
