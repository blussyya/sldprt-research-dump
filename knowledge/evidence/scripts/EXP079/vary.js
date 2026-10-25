// per-byte variability of the base header tail (+ next bytes) across all feature objects found by signature
const fs=require('fs'),path=require('path');const P=require('../../../../package/src/parasolid/partition');const {Reader,feature}=require('./archive');
const R='../../../../';const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
const files=[...walk(R+'test files new/SW2022'),...walk(R+'test files original').filter(f=>!/controlled/.test(f))];
const rows=[];
for(const f of files){let all;try{all=P.streams(fs.readFileSync(f))}catch(e){continue}const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));if(!k)continue;const b=all[k];if(b.readUInt16LE(2)===0xffff)continue;
 for(let i=0;i+8<b.length;i++){if(!(b[i+1]===0x80&&b[i+3]===0x80&&b[i+4]===0xff&&b[i+5]===0xfe&&b[i+6]===0xff))continue;
  const r=new Reader(b,0);r.p=i+2;const o={};try{feature(r,o);}catch(e){continue;}
  rows.push({f:path.basename(f),name:o.name,tail:Buffer.from(o.tail+b.subarray(r.p,r.p+12).toString('hex'),'hex'),o});}}
console.log('features',rows.length);
const L=rows[0].tail.length;let line='';
for(let j=0;j<L;j++){const vals=new Set(rows.map(r=>r.tail[j]));line+=vals.size===1?[...vals][0].toString(16).padStart(2,'0'):'..';}
console.log('tail pattern (.. = varies):');console.log(line.replace(/(..)/g,'$1 '));
// what values at varying positions
for(let j=0;j<L;j++){const m=new Map();for(const r of rows)m.set(r.tail[j],(m.get(r.tail[j])||0)+1);if(m.size>1&&m.size<6)console.log(j,[...m].map(([v,c])=>v.toString(16)+':'+c).join(' '));}
const fl=new Map();for(const r of rows)fl.set(r.o.flags.toString(16),(fl.get(r.o.flags.toString(16))||0)+1);console.log('flags',[...fl].join(' '));
const groups=new Map();for(const r of rows){const key=r.tail.subarray(0,20).toString('hex').replace(/^(00ffff000003ffffffffffffffff000080bf).*/,'STD');groups.set(key,(groups.get(key)||[]).concat([r.f.slice(0,12)+':'+r.name.slice(0,16)]));}
for(const [k,v] of groups)console.log(String(v.length).padStart(4),k.slice(0,60),v.slice(0,4).join(' | '));
