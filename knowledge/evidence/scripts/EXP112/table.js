// EXP-112: one row per modern file: head bytes, the three signatures, where the real
// end-of-directory record sits, and a self-check (record offset == dir offset + dir size + 8).
const fs=require('fs'),path=require('path'),analyse=require('./eocd.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git'&&e.name!=='node_modules')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const rows=[];let modern=0,none=0,multi=0;
for(const f of walk(root)){const r=analyse(f);if(!r)continue;modern++;
  const ok=r.cands.filter(c=>c.ok);
  if(ok.length!==1){(ok.length?multi++:none++);console.error('ok='+ok.length,f);if(!ok.length)continue;}
  const c=ok[0];
  rows.push({f:path.relative(root,f),size:r.size,head:r.head,L:c.lsig,C:c.csig,E:c.sig.match(/../g).reverse().join(''),n:c.n,at:c.at,self:c.at===c.off+c.size+8,cands:r.cands.length,idx:r.cands.indexOf(c),fromEnd:r.size-c.at});
}
fs.writeFileSync('table.json',JSON.stringify(rows,null,0).replace(/\},/g,'},\n'));
console.log('modern',modern,'one real dir',rows.length-multi,'none',none,'multi',multi,'self-check ok',rows.filter(r=>r.self).length);
console.log('cands range',Math.min(...rows.map(r=>r.cands)),Math.max(...rows.map(r=>r.cands)),'distinct heads',new Set(rows.map(r=>r.head.slice(0,8))).size);
