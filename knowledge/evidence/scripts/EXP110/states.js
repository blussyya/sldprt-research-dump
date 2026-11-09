'use strict';
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const c=(a,f)=>{const m={};for(const r of a){const k=f(r);m[k]=(m[k]||0)+1;}return Object.entries(m).sort((x,y)=>y[1]-x[1]);};
console.log('rows',rows.length);
// per word position: distinct values (as u32) 
for(let i=0;i<10;i++){const m=c(rows,r=>r.w[i]);console.log('word',92+4*i,m.length,'distinct',m.slice(0,6).map(x=>x.join(':')).join(' '));}
// flags state key
const key=r=>[r.w[0],r.w[1],r.w[3],r.w[4],r.w[9]].join('');
console.log(c(rows,key));
// byte 100 word
console.log('w100',c(rows,r=>r.w[2]));
// float words 112..124 in non-vector state: values
const nv=rows.filter(r=>!(r.w[3]===1&&r.w[4]===1));
console.log('non-vector rows',nv.length,'w[5..8] zero all?',nv.filter(r=>r.w.slice(5,9).every(x=>x===0)).length);
console.log(c(nv,r=>r.w.slice(5,9).map(x=>x===0?'0':'x').join('')));
// 112..127 in vector state: first float
const v=rows.filter(r=>r.w[3]===1&&r.w[4]===1);
console.log('vector rows',v.length);
console.log('vec by key',c(v,key));
console.log('vec by tag',c(v,r=>r.tag));
console.log('first float stats');
const s=v.map(r=>r.fl[5]);console.log(Math.min(...s),Math.max(...s));
console.log(c(v,r=>r.fl[5].toPrecision(3)).slice(0,15));
