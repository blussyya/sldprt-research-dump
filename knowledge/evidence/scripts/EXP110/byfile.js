'use strict';
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const idxs={w96:1,w104:3,w108:4};
// is the bit constant within (file, tag)? and per file?
for(const [name,i] of Object.entries(idxs)){
  const g={},gt={};
  for(const r of rows){(g[r.file]=g[r.file]||new Set()).add(r.w[i]);(gt[r.file+'|'+r.tag]=gt[r.file+'|'+r.tag]||new Set()).add(r.w[i]);}
  const pure=Object.values(g).filter(s=>s.size===1).length,pureT=Object.values(gt).filter(s=>s.size===1).length;
  console.log(name,'files',Object.keys(g).length,'constant per file',pure,'| (file,tag) groups',Object.keys(gt).length,'constant',pureT);
}
// planes: w96 zero where
const pl=rows.filter(r=>r.tag===4001);
const z=pl.filter(r=>r.w[1]===0);
const zf={};for(const r of z)zf[r.file]=(zf[r.file]||0)+1;
const allf={};for(const r of pl)allf[r.file]=(allf[r.file]||0)+1;
console.log('plane w96=0 files',Object.keys(zf).length,Object.entries(zf).slice(0,12).map(([f,n])=>f.split('/').slice(-2).join('/').slice(0,30)+' '+n+'/'+allf[f]));
