// Which parts have several display faces with the same face id (rawId from my own raw read, good records only)?
const fs=require('fs'),path=require('path'),L=require('./lib'),S=require('/home/user/solidworks-converters/src/container/modern');
const root='/home/user/sldprt-research-dump';const files=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files online');
const rows=[];
for(const f of files){let raw=fs.readFileSync(f);if(S.isOLE2(raw))continue;let b;try{b=L.dlBytes(f);}catch(e){continue;}if(!b)continue;
  const ids=new Map();let good=0;
  for(const x of L.scan(b)){const m=L.meta(b,x);if(m.err||!m.res.every(v=>v===0)||!(m.tag>=4001&&m.tag<=4010))continue;good++;(ids.get(m.id)||ids.set(m.id,[]).get(m.id)).push(x.off);}
  const dup=[...ids].filter(([,v])=>v.length>1);
  rows.push({f:path.relative(root,f),good,distinct:ids.size,dupIds:dup.length,dupFaces:dup.reduce((s,[,v])=>s+v.length,0)});}
fs.writeFileSync('finddups.json',JSON.stringify(rows,null,1));
for(const r of rows)if(r.dupIds)console.log(r.f.slice(-60),JSON.stringify(r));
console.log('parts',rows.length,'withGood',rows.filter(r=>r.good).length,'withDups',rows.filter(r=>r.dupIds).length);
