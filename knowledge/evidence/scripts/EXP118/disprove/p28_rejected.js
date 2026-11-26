// Records the display reader rejects (and cosmetic-thread overlays) across the corpus: their meshes
// are not in parse().faces, so claim 4's scan can't see them.
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs'),path=require('path');
const roots=['test files online','test files new','test files original'].map(r=>'/home/user/sldprt-research-dump/'+r);
const files=[];(function walk(ds){for(const d of ds)for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!/^exports/i.test(e.name))walk([p]);}else if(/\.sldprt$/i.test(e.name))files.push(p);}})(roots);
let rej=0,ov=0;const by={};
for(const f of files){let d;try{d=S.parse(fs.readFileSync(f));}catch(e){continue;}const n=(d.rejected||[]).length;rej+=n;ov+=(d.overlays||[]).length;if(n)by[path.basename(f)]=[...new Set(d.rejected.map(r=>r.reason.slice(0,50)))].join('; ')+' x'+n;}
console.log('rejected records',rej,'overlays',ov,JSON.stringify(by,null,0));
