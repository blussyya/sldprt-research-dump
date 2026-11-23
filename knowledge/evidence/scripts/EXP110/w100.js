'use strict';
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const key=r=>[r.w[0],r.w[1],r.w[3],r.w[4]].join('');
const c=(a,f)=>{const m={};for(const r of a){const k=f(r);m[k]=(m[k]||0)+1;}return Object.entries(m).sort((x,y)=>y[1]-x[1]);};
console.log('is999999 by state',c(rows,r=>key(r)+' '+(r.w[2]===999999)));
console.log('is999999 by tag',c(rows,r=>r.tag+' '+(r.w[2]===999999)));
const nz=rows.filter(r=>r.w[2]!==999999);
const buf=Buffer.alloc(4);
const asF=u=>{buf.writeUInt32LE(u);return buf.readFloatLE(0);};
console.log('sample non-sentinel w100 as u32/hex/float:');
for(const r of nz.slice(0,15))console.log(r.file.split('/').slice(-2,-1)[0],r.tag,key(r),r.w[2],r.w[2].toString(16),asF(r.w[2]));
console.log('w100 high-byte hist',c(nz,r=>(r.w[2]>>>24).toString(16)).slice(0,12));
console.log('w100 per file (non-sentinel share)');
const byF={};for(const r of rows){const o=byF[r.file]||(byF[r.file]={n:0,s:0});o.n++;if(r.w[2]===999999)o.s++;}
const mixed=Object.entries(byF).filter(([f,o])=>o.s>0&&o.s<o.n).length,all=Object.entries(byF).filter(([f,o])=>o.s===o.n).length,none=Object.entries(byF).filter(([f,o])=>o.s===0).length;
console.log({files:Object.keys(byF).length,allSentinel:all,mixed,noneSentinel:none});
