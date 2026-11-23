'use strict';
// Second route: read Block2 lengths and Block3 bytes straight from the inflated display stream (not f.block3/f.stripLengths),
// then count the byte at each strip start. Compare with survey.js (first: 0=18398 1=2690; later: 0=128142 4=16455).
const {S,files}=require('./lib');const fs=require('fs');
const modern=S.container?.modern||require('/home/user/conv-dev/src/container/modern'),ole=require('/home/user/conv-dev/src/container/ole');
const zlib=require('zlib');
const inflateRaw=b=>zlib.inflateRawSync(b),inflateZlib=b=>zlib.inflateSync(b);
const H={first:{},later:{}};let faces=0;
for(const file of files()){const b=fs.readFileSync(file);let dl;
 try{const legacy=modern.isOLE2(b);const raw=legacy?ole.displayLists(b,inflateZlib).bytes:modern.findDisplayLists(b,inflateRaw,inflateZlib);if(!raw)continue;dl=Buffer.from(raw);
  const parsed=S.display.extractDisplayLists(dl,legacy);
  for(const f of parsed.faces){if(f.noEdgeTable)continue;faces++;
   const o2=f.offsets.block2,o3=f.offsets.block3,n=dl.readUInt32LE(o2+12);let at=0;
   for(let i=0;i<n;i++){const len=dl.readUInt32LE(o2+16+4*i);const byte=dl[o3+16+at];const k=i===0?'first':'later';H[k][byte]=(H[k][byte]||0)+1;at+=len;}}
 }catch(e){}}
console.log({faces,H});
