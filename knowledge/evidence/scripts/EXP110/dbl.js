'use strict';
/* Which 4-aligned offsets in +96..+131 hold a plausible double (finite, 1e-9 <= |x| <= 1e3 or exactly 0)?
 * Counted per state and tag. Control: random 8-byte windows from the same bytes shifted are not used;
 * instead the same count is taken on the record's float region of known doubles (+12..+84). */
const fs=require('fs');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const key=r=>r.w[0]+''+r.w[1]+r.w[3]+r.w[4];
const plaus=x=>Number.isFinite(x)&&(Math.abs(x)>=1e-9&&Math.abs(x)<=1e3);
const res={};
for(const r of rows){
  const b=Buffer.from(r.hex,'hex'); // starts at +92
  const k=key(r);const o=res[k]=res[k]||{n:0,off:{}};o.n++;
  for(let p=0;p+8<=b.length;p+=4){const x=b.readDoubleLE(p);if(plaus(x))o.off[92+p]=(o.off[92+p]||0)+1;}
}
for(const k of Object.keys(res).sort()){console.log(k,'n',res[k].n,JSON.stringify(res[k].off));}
