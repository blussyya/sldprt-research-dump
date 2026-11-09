'use strict';
// Across the whole corpus: for each moFR_c (feature id, stamp), compare stamp with floor(node FT) of the same feature id.
const fs=require('fs'),path=require('path');
const {frs}=require('./fr');const {nodes,ft}=require('./survey_nodes');
const root='/home/user/sldprt-research-dump';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
const out=[];let pairs=0;const diff={};const per=[];
for(const f of ['test files new','test files original','test files online'].flatMap(d=>walk(path.join(root,d)))){
 let list,rows;try{list=frs(f);({rows}=nodes(f));}catch(e){continue;}
 const byId=new Map();for(const n of rows){if(n.id===0xffffffff)continue;byId.set(n.id,n);}
 const seen=new Set();
 for(const r of list){const k=r.feature+':'+r.stamp;if(seen.has(k))continue;seen.add(k);const n=byId.get(r.feature);if(!n){diff['no node']=(diff['no node']||0)+1;continue;}
  const b=Buffer.from(n.tail,'hex');const t=ft(b.readUInt32LE(46),b.readUInt32LE(50));if(!(t>9.5e8)){diff['FT empty']=(diff['FT empty']||0)+1;continue;}
  const d=r.stamp-Math.floor(t);diff[d]=(diff[d]||0)+1;pairs++;per.push({f:path.relative(root,f),id:r.feature,name:n.name,stamp:r.stamp,t,d});}}
fs.writeFileSync('out/frall.json',JSON.stringify(per));
console.log(pairs,diff);
console.log(per.filter(p=>p.d!==0).slice(0,20));
