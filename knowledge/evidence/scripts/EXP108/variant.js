'use strict';
// EXP108: what separates 480xx variants k = tag-48000-16*class (-1,0,+1,+2) within one curve class.
const fs=require('fs');
const L=fs.readFileSync(__dirname+'/out/edges.jsonl','utf8').trim().split('\n').map(JSON.parse);
const m={};
const add=(k,v)=>{m[k]=m[k]||{};m[k][v]=(m[k][v]||0)+1;};
for(const r of L){
  const ts=r.sides.map(s=>s.tags&&s.tags.length===1?s.tags[0]:null);
  const t=ts.find(x=>x&&x>=48000);if(!t)continue;
  const cl=Math.round((t-48000)/16),k=t-48000-16*cl;
  const key='class'+cl+' k='+k;
  add(key,'nuse='+r.nuse);
  add(key,'tolerant='+r.tolerant);
  add(key,'closed='+r.closed);
  add(key,'trimmed='+r.trimmed);
  if(r.nuse===2)add(key,'pair='+r.sides.map(s=>s.ftype).sort().join('/'));
  if(r.dihedral){const a=Math.abs(r.dihedral.ang);add(key,'angbin='+(a<1e-6?'0':a<1e-3?'<1e-3':a<0.05?'<0.05':a<1?'<1':'>=1'));}
}
for(const k of Object.keys(m).sort()){console.log('## '+k);const e=Object.entries(m[k]).sort((a,b)=>b[1]-a[1]).slice(0,22);for(const [a,b] of e)console.log('   '+a+': '+b);}
