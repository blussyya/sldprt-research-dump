#!/usr/bin/env node
/* EXP-059 — reproduces every measurement in the review of EXP-058/EXP-056. */
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..');
const E=require(path.join(ROOT,'v0.4.9/exp058_schema_boundary.js'));
const P=require(path.join(ROOT,'parser/v0.1/src/parser-core.js'));
const XT=require(path.join(ROOT,'parasolid/v0.1/src/xt-reader.js'));
const strip=b=>{const e=b.indexOf('**END_OF_HEADER');return e<0?b:b.subarray(b.indexOf('\n',e)+1);};
const sha=b=>crypto.createHash('sha1').update(b).digest('hex').slice(0,10);
const NEW=path.join(ROOT,'test files new');

console.log('§1.1  are the text scanner\'s 19 matches one contiguous table?');
{
 const s=fs.readFileSync(path.join(NEW,'SW2022/C00_cube_10mm/model.x_t'),'latin1');
 const t=s.slice(s.indexOf('**END_OF_HEADER')).replace(/\r?\n/g,'');
 const re=/([A-Z]+)(\d+) /g;let m;const hits=[];
 while((m=re.exec(t))){const n=+m[2],at=m.index+m[0].length,name=t.substr(at,n);
  if(!/^[a-z_][a-z0-9_]*$/.test(name))continue;
  if(!/^(\d+) (\d+)/.test(t.slice(at+n)))continue;
  hits.push({pos:m.index,name});re.lastIndex=at+n;}
 const gaps=hits.slice(1).map((h,i)=>h.pos-hits[i].pos);
 console.log(`   matches=${hits.length}  gaps>40: ${gaps.filter(g=>g>40).join(', ')}`);
 console.log(`   contiguous prefix = ${gaps.findIndex(g=>g>40)+1}`);
}

console.log('\n§2  independence of the 24 SW2022 models');
{
 const B=path.join(NEW,'SW2022'),tab=new Set(),raw=new Set(),ptab=new Set();
 for(const d of fs.readdirSync(B).sort()){const dir=path.join(B,d);
  if(!fs.statSync(dir).isDirectory())continue;
  const xb=strip(fs.readFileSync(path.join(dir,'model.x_b'))),b=E.binary(xb);
  tab.add(sha(JSON.stringify(b.entries)));raw.add(sha(xb.subarray(0,349)));
  const s=P.decompressOpenSX(fs.readFileSync(path.join(dir,'model.SLDPRT')),x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));
  const k=Object.keys(s).find(x=>/Config-0-Partition$/.test(x));
  ptab.add(sha(JSON.stringify(E.binary(zlib.inflateSync(Buffer.from(s[k]).subarray(28))).entries)));}
 console.log(`   distinct export tables=${tab.size}  distinct bytes[0..349]=${raw.size}  distinct partition tables=${ptab.size}`);
}

console.log('\n§3  discriminating power of the flag comparison');
{
 const B=path.join(NEW,'SW2022'),f={},b2={},b3={};
 for(const d of fs.readdirSync(B).sort()){const dir=path.join(B,d);
  if(!fs.statSync(dir).isDirectory())continue;
  const xb=strip(fs.readFileSync(path.join(dir,'model.x_b'))),bin=E.binary(xb);
  const txt=E.textPrefix(fs.readFileSync(path.join(dir,'model.x_t'),'latin1'));
  bin.entries.forEach((e,i)=>{const ext=e.extension===null?0:1+e.extension.length,st=e.end-ext-4;
   f[txt.entries[i].flag]=(f[txt.entries[i].flag]||0)+1;
   b2[xb[st+2]]=(b2[xb[st+2]]||0)+1;b3[xb[st+3]]=(b3[xb[st+3]]||0)+1;});}
 console.log(`   text flags=${JSON.stringify(f)}  byte@code+2=${JSON.stringify(b2)}  byte@code+3=${JSON.stringify(b3)}`);
 console.log('   every candidate is constant, so any always-zero field "agrees": no discriminating power');
}

console.log('\n§4/§5  generalization, and textPrefix across schemas');
for(const set of ['SW2011','SW2022']){
 const B=path.join(NEW,set);let bo=0,bf=0,to=0,tf=0;const shapes=new Map();
 for(const d of fs.readdirSync(B).sort()){const dir=path.join(B,d);
  if(!fs.statSync(dir).isDirectory()||!fs.existsSync(path.join(dir,'model.x_b')))continue;
  const xb=strip(fs.readFileSync(path.join(dir,'model.x_b')));
  const sc=(xb.toString('latin1').match(/SCH_[0-9_]+/)||['?'])[0];
  let b=null;try{b=E.binary(xb);bo++;}catch(e){bf++;}
  try{E.textPrefix(fs.readFileSync(path.join(dir,'model.x_t'),'latin1'));to++;}catch(e){tf++;}
  if(b)shapes.set(`${sc} entries=${b.entries.length} Z@${b.end}`,(shapes.get(`${sc} entries=${b.entries.length} Z@${b.end}`)||0)+1);}
 console.log(`   ${set}: binary ${bo} ok/${bf} fail   textPrefix ${to} ok/${tf} fail`);
 for(const [k,v] of shapes)console.log(`      ${k}  (${v})`);
}
{
 const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(path.join(ROOT,'test files original'));
 const by=new Map();let ok=0,fail=0;
 for(const f of files.sort()){const buf=fs.readFileSync(f);if(P.isOLE2(buf))continue;
  let inner;try{const s=P.decompressOpenSX(buf,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));
   const k=Object.keys(s).find(x=>/Config-0-Partition$/.test(x));
   inner=zlib.inflateSync(Buffer.from(s[k]).subarray(28));}catch(e){continue;}
  const sc=(inner.toString('latin1').match(/SCH_[0-9_]+/)||['?'])[0];
  try{const r=E.binary(inner);ok++;by.set(`${sc} entries=${r.entries.length} Z@${r.end}`,(by.get(`${sc} entries=${r.entries.length} Z@${r.end}`)||0)+1);}catch(e){fail++;}}
 console.log(`   original-corpus partitions: ${ok} ok / ${fail} fail, ${by.size} distinct prefixes`);
 for(const [k,v] of by)console.log(`      ${k}  (${v})`);
}

console.log('\n§7  the value after Z');
{
 const B=path.join(NEW,'SW2022');
 for(const d of ['C14_sphere','C00_cube_10mm','C20_cylinders_crossed','C16_loft_spline']){
  const xb=strip(fs.readFileSync(path.join(B,d,'model.x_b'))),b=E.binary(xb);
  console.log(`   ${d.padEnd(24)} Z@${b.end}  u16be@Z+5 = ${xb.readUInt16BE(b.end+5)}`);}
}
