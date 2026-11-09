#!/usr/bin/env node
'use strict';
/* EXP-099 step 10: raw bytes behind the three odd tags. For every odd record (56): the 4 bytes read as typeTag and
 * the 4 bytes read as rawId, hex plus the neighbouring bytes decoded as UTF-16LE text, and which of the tail
 * fields the converter's grammar put there. Writes oddbytes.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const sw=JSON.parse(fs.readFileSync(path.join(__dirname,'sweep.json')));
const out={};
for(const part of sw.parts){if(!part.odd||!part.odd.length)continue;
  const buf=fs.readFileSync(ROOT+part.file),d=S.parse(buf),b=Buffer.from(S.container.modern.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));
  const rows={};
  for(const F of d.faces){const m=F.metadata;if(!m||(m.typeTag>=4001&&m.typeTag<=4010))continue;
    const t=m.offset;// typeTag offset
    const key=b.slice(t,t+4).toString('hex')+' | rawId '+b.slice(t-28,t-24).toString('hex')+' | reserved '+m.reserved.map(x=>x.toString(16)).join(',');
    const r=rows[key]=rows[key]||{n:0,tag:m.typeTag,rawId:m.rawId,ctxHex:b.slice(t-8,t+12).toString('hex'),ctxUtf16:b.slice(t-8,t+12).toString('utf16le').replace(/[^\x20-\x7e]/g,'.'),relTagOffsetFromGeometryEnd:t-F.geometryEnd};r.n++;}
  out[part.file]={oddRecords:part.odd.length,distinct:rows,hexTagAsDouble:null};
}
// decode helper facts
out.facts={'16368=0x3FF0':'upper 16 bits of the f64 1.0 (00 00 00 00 00 00 f0 3f) read from its last two bytes + the next two zero bytes','4980815=0x4C004F':'UTF-16LE "O","L": 4f 00 4c 00','65536=0x10000':'bytes 00 00 01 00','4294967295':'ff ff ff ff'};
fs.writeFileSync(path.join(__dirname,'oddbytes.json'),JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out,null,1));
