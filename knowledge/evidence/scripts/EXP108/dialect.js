'use strict';
// EXP108: the two files whose 480xx numbers all end in -1 relative to 16*class: DL version, other 480xx files' versions.
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',modern=require(CONV+'/container/modern'),inflate=require(CONV);
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const rows=fs.readFileSync(path.join(__dirname,'out/rows.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const per={};for(const r of rows){if(r.t<48000)continue;const cl=Math.round((r.t-48000)/16),k=r.t-48000-16*cl;per[r.file]=per[r.file]||{ks:new Set()};per[r.file].ks.add(k);}
for(const f of Object.keys(per)){const st=modern.decompressOpenSX(new Uint8Array(fs.readFileSync(path.join(CORPUS,f))),inflate.inflateRaw,inflate.inflateZlib);
  console.log(String(modern.displayListsVersion(st)).padEnd(6),[...per[f].ks].sort().join(',').padEnd(8),f);}
