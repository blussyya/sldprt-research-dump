'use strict';
// EXP108: is the fourth word of the post-table header (101, 102, ...) tied to the persistent-id string?
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',S=require(CONV),modern=require(CONV+'/container/modern'),inflate=require(CONV);
const CORPUS=process.env.SLDPRT_CORPUS||'/home/user/sldprt-research-dump';
const tj=fs.readFileSync(path.join(__dirname,'out/tail.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const by={};for(const r of tj)(by[r.file]=by[r.file]||[]).push(r);
let kStr=0,kMulti=0,strMulti=0,seq=0,faces=0,mono=0;
for(const [f,rs] of Object.entries(by)){
  const buf=new Uint8Array(fs.readFileSync(path.join(CORPUS,f)));const dl=modern.findDisplayLists(buf,inflate.inflateRaw,inflate.inflateZlib);
  const dv=new DataView(dl.buffer,dl.byteOffset,dl.byteLength);const d=S.parse(path.join(CORPUS,f));
  const K=[];rs.forEach(r=>{const a=d.faces[r.i];K.push({k:dv.getUint32(a.metadata.end+12,true),s:r.s});});
  const m=new Map();K.forEach(x=>{if(!m.has(x.k))m.set(x.k,new Set());m.get(x.k).add(x.s);});
  for(const v of m.values()){kStr++;if(v.size>1)kMulti++;}
  const sm=new Map();K.forEach(x=>{if(!x.s)return;if(!sm.has(x.s))sm.set(x.s,new Set());sm.get(x.s).add(x.k);});
  for(const v of sm.values())if(v.size>1)strMulti++;
  faces+=K.length;let mx=0,new_=0;K.forEach(x=>{if(x.k>mx){new_++;mx=x.k;}});if(new_>0)mono++;
}
console.log({parts:Object.keys(by).length,faces,distinctK_perPart:kStr,K_with_several_strings:kMulti,strings_with_several_K:strMulti});
