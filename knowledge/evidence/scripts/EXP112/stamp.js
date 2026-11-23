// EXP-112: the 4 bytes at the ZIP time/date position. How many values per file, and are they
// valid DOS dates?
const fs=require('fs'),path=require('path');const m=require('/home/user/solidworks-converters/src/container/modern.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const seen=new Set(),per={};let valid=0,n=0;
for(const f of walk(root)){const b=fs.readFileSync(f);if(m.isOLE2(b)||b[4]|b[5]|b[6])continue;const k=b.subarray(0,16).toString('hex')+b.length;if(seen.has(k))continue;seen.add(k);
  const st=new Map();for(const e of m.readDirectory(b)){const s=b.readUInt32LE(e.header+10);(st.get(s)||st.set(s,[]).get(s)).push(e.name);n++;const t=s&0xffff,d=s>>>16,mo=(d>>5)&15,da=d&31;if(mo>=1&&mo<=12&&da>=1&&(t>>11)<24&&((t>>5)&63)<60&&(t&31)<30)valid++;}
  per[st.size]=(per[st.size]||0)+1;
  if(seen.size===1)for(const [s,names] of st)console.log(s.toString(16),names.length,names.slice(0,3).join(' | '));}
console.log('distinct stamps per file -> files',JSON.stringify(per),'entries',n,'valid as DOS time/date',valid);
