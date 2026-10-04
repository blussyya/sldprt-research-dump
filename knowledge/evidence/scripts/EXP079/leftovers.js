// For every feature-like object (signature: classref, ownerRef 0x80xx, FF FE FF name) in every file,
// read the base header and print what follows up to the next new-class tag or next feature signature.
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const {Reader,feature}=require('./archive');
const want=process.argv[2]||'',max=+(process.argv[3]||120);
const R='../../../../';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
const files=[...walk(R+'test files new/SW2022'),...walk(R+'test files original').filter(f=>!/controlled/.test(f))];
for(const f of files){let all;try{all=P.streams(fs.readFileSync(f))}catch(e){continue}
  const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));if(!k)continue;const b=all[k];
  if(b.readUInt16LE(2)===0xffff)continue;   // 2011 layout handled later
  // class names by first tag; class index known only for first instances: name = tag name
  const s=b.toString('latin1');const sig=[];
  for(let i=0;i+8<b.length;i++){if(b[i+1]===0x80&&b[i+3]===0x80&&b[i+4]===0xff&&b[i+5]===0xfe&&b[i+6]===0xff)sig.push(i);}
  const tags=[];const re=/\xff\xff[\x00-\x05]\x00([\x03-\x3f])\x00([A-Za-z][A-Za-z0-9_]{2,62})/g;let m;while((m=re.exec(s)))if(m[2].length===m[1].charCodeAt(0))tags.push({at:m.index,name:m[2],data:m.index+6+m[2].length});
  const starts=[...new Set([...sig.map(i=>i+2),...tags.map(t=>t.data),...tags.map(t=>t.at)])].sort((a,c)=>a-c);
  for(const t of tags){if(want&&t.name!==want)continue;if(b[t.data+1]!==0x80||b[t.data+2]!==0xff)continue;
    const r=new Reader(b,0);r.p=t.data;const o={};try{feature(r,o);}catch(e){console.log(path.basename(f),t.name,'base failed',e.message);continue;}
    const nxt=starts.find(x=>x>=r.p);
    console.log((path.basename(path.dirname(f)).slice(0,18)+'/'+path.basename(f).slice(0,10)).padEnd(30),t.name.padEnd(26),o.name.slice(0,14).padEnd(15),String((nxt||b.length)-r.p).padStart(4),b.subarray(r.p,Math.min(nxt||b.length,r.p+max)).toString('hex'));}
}
