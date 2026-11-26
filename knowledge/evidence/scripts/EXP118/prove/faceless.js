// The corpus files the reader returns no display faces for (from sweep.js): container, streams and
// whether any stream name or content suggests saved tessellation; plus the 4 faces that have a
// Block1 but no nonzero id.
const fs=require('fs'),path=require('path');const S=require('/home/user/solidworks-converters/src');
const res=JSON.parse(fs.readFileSync(path.join(__dirname,'sweep.out.json')));
for(const e of res.parseErrors){const rel=e.split(': ')[0].replace(/ \(own bytes\)$/,'');const p=path.join('/home/user/sldprt-research-dump',rel);
  let i;try{i=S.info(p);}catch(err){console.log(rel,'info failed',err.message);continue;}
  const dl=(i.streams||[]).filter(s=>/display/i.test(s.name));
  console.log(rel.replace('test files ',''),'|',i.container,'|',i.containerError||'','| streams',(i.streams||[]).length,'| display-like',dl.map(s=>s.name+':'+s.bytes).join(',')||'none','| DL version',i.displayListsVersion||'-','| display errors',(i.display.errors||[]).join(';'));}
