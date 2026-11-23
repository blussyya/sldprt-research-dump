'use strict';
// EXP108: which parts use 300x vs 480xx, against DisplayLists version tag and path.
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',S=require(CONV),modern=require(CONV+'/container/modern'),inflate=require(CONV);
const rows=fs.readFileSync(path.join(__dirname,'out/rows.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const fam={};for(const r of rows){fam[r.file]=fam[r.file]||{f:r.t<4000?'300x':'480xx'};}
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const res={};
for(const f of Object.keys(fam)){
  const buf=new Uint8Array(fs.readFileSync(path.join(CORPUS,f)));
  let ver='?';try{const st=modern.decompressOpenSX(buf,inflate.inflateRaw,inflate.inflateZlib);ver=String(modern.displayListsVersion(st));}catch(e){}
  const sw=f.split('/').find(p=>/^SW\d+$/.test(p))||f.split('/')[0]+'/'+f.split('/')[1];
  const k=fam[f].f+' | DL '+ver;res[k]=(res[k]||0)+1;fam[f].ver=ver;
  const k2=fam[f].f+' | '+sw;res[k2]=(res[k2]||0)+1;
}
console.log(Object.entries(res).sort().map(a=>a.join(': ')).join('\n'));

console.log('\nper-file DL version lines for 300x with version >=:');
