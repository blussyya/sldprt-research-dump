'use strict';
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const key=r=>r.w[0]+''+r.w[1]+r.w[3]+r.w[4];
const tab=(rowf,colf,rs=rows)=>{const m={},cols=new Set();for(const r of rs){const a=rowf(r),b=colf(r);cols.add(b);(m[a]=m[a]||{})[b]=(m[a][b]||0)+1;}
  const cs=[...cols].sort();console.log(''.padEnd(14),cs.map(c=>String(c).padStart(7)).join(''));
  for(const a of Object.keys(m).sort())console.log(String(a).padEnd(14),cs.map(c=>String(m[a][c]||0).padStart(7)).join(''));};
console.log('--- state (w92 w96 w104 w108) by display tag');tab(r=>r.tag,key);
console.log('--- joined native type by display tag (how!=none)');tab(r=>r.tag,r=>r.nat?r.nat.surf.type:'-');
for(const [name,f] of [['w92',r=>r.w[0]],['w96',r=>r.w[1]],['w104',r=>r.w[3]],['w108',r=>r.w[4]]]){
  console.log('---',name,'by tag');tab(r=>r.tag,r=>f(r));}
