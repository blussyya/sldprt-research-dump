#!/usr/bin/env node
/* EXP-060 — does the Parasolid layer survive into the legacy OLE2 container?
 * Extracts Contents/Config-0-Partition from the SolidWorks 2011 OLE2 files and
 * runs the same readers used on the modern corpus. Also reports what the legacy
 * DisplayLists stream looks like. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../../../..');
const X=require(path.join(ROOT,'v0.3.2/src/sldprt-extractor.js'));
const XT=require(path.join(ROOT,'parasolid/v0.1/src/xt-reader.js'));
const E=require(path.join(ROOT,'v0.4.9/exp058_schema_boundary.js'));
const MAGIC=Buffer.from('231dd571da8148a2a85898b21b89ef99','hex');

function readBig(buf,ole,start,size){const ss=ole.ss,out=[];let s=start,g=0;
 while(s>=0&&s<0xFFFFFFFA&&g<size){out.push(buf.subarray((s+1)*ss,(s+1)*ss+ss));g+=ss;s=ole.fat[s];}
 return Buffer.concat(out).subarray(0,size);}
function readStream(buf,ole,e){
 if(e.size>=ole.miniCutoff)return readBig(buf,ole,e.startSector,e.size);
 const root=ole.rootEntry||ole.entries[0];
 const big=readBig(buf,ole,root.startSector,root.size);
 const mfat=[];let sec=ole.miniFatStartSec;
 while(sec>=0&&sec<0xFFFFFFFA){const off=(sec+1)*ole.ss;
  for(let i=0;i<ole.ss;i+=4)mfat.push(buf.readUInt32LE(off+i));sec=ole.fat[sec];}
 const out=[];let s=e.startSector,g=0;
 while(s>=0&&s<0xFFFFFFFA&&g<e.size){out.push(big.subarray(s*64,s*64+64));g+=64;s=mfat[s];}
 return Buffer.concat(out).subarray(0,e.size);}

const B=path.join(ROOT,'test files new/SW2011');
let n=0,magicOK=0,inflOK=0,hdrOK=0,declOK=0;
const schemas=new Map(),shapes=new Map(),dlv=new Map(),dlNames=new Map();
for(const d of fs.readdirSync(B).sort()){
 const dir=path.join(B,d); if(!fs.statSync(dir).isDirectory())continue;
 const buf=fs.readFileSync(path.join(dir,'model.SLDPRT'));
 if(buf.subarray(0,4).toString('hex')!=='d0cf11e0'){console.log(`${d}: not OLE2`);continue;}
 n++;
 const ole=X.parseOLE2(buf);
 for(const e of ole.entries) if(/DisplayLists/.test(e.name)) dlNames.set(e.name,(dlNames.get(e.name)||0)+1);
 for(const e of ole.entries) if(/^_DL_VERSION_/.test(e.name)) dlv.set(e.name,(dlv.get(e.name)||0)+1);
 const pe=ole.entries.find(x=>x.name==='Config-0-Partition');
 if(!pe){console.log(`${d}: no partition`);continue;}
 const raw=readStream(buf,ole,pe);
 if(raw.subarray(4,20).equals(MAGIC))magicOK++;
 let inner=null;
 for(let i=0;i<Math.min(raw.length-2,512);i++)
  if(raw[i]===0x78&&[0x01,0x5e,0x9c,0xda].includes(raw[i+1])){
   try{inner=zlib.inflateSync(raw.subarray(i));break;}catch(err){}}
 if(!inner){console.log(`${d}: no inflate`);continue;}
 inflOK++;
 try{const h=XT.readHeader(inner);hdrOK++;schemas.set(h.schema,(schemas.get(h.schema)||0)+1);}catch(err){console.log(`${d}: header ${err.message}`);continue;}
 try{const b=E.binary(inner);declOK++;
  const k=`${b.entries.length} decls, Z@${b.end}`;shapes.set(k,(shapes.get(k)||0)+1);}
 catch(err){console.log(`${d}: decl ${err.message}`);}
}
console.log(`\nSolidWorks 2011 legacy OLE2 files: ${n}`);
console.log(`  16-byte section magic at offset 4 : ${magicOK}/${n}`);
console.log(`  inner zlib inflated               : ${inflOK}/${n}`);
console.log(`  PS transmit header parsed         : ${hdrOK}/${n}`);
console.log(`  declaration prefix parsed         : ${declOK}/${n}`);
console.log(`  schemas: ${[...schemas].map(([k,v])=>k+' ('+v+')').join(', ')}`);
console.log(`  shapes : ${[...shapes].map(([k,v])=>k+' ('+v+')').join(', ')}`);
console.log(`  DisplayLists stream names: ${[...dlNames].map(([k,v])=>k+' ('+v+')').join(', ')}`);
console.log(`  _DL_VERSION storages     : ${[...dlv].map(([k,v])=>k+' ('+v+')').join(', ')}`);
