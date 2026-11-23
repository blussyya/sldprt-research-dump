#!/usr/bin/env node
'use strict';
/* EXP-099 step 3: scan each face record's bytes (geometryEnd .. next record) for the metadata
 * tail grammar: u32 rawId, 3 x f64 unit direction, u32 tag in 4001..4010, 8 x f64, u32 count.
 * Control: the same scan on faces the reader parsed fine must find the tag at the reader's offset.
 * Usage: node scan.js  -> scan.json */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
function dlOf(buf){const m=S.container.modern;return Buffer.from(m.isOLE2(buf)?S.container.ole.displayLists(buf,S.inflateZlib).bytes:m.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));}
// candidate tail start positions s (rawId) inside [lo,hi)
function find(b,lo,hi){
  const hits=[];
  for(let s=lo;s+4+24+4+64+4<=hi;s++){
    const tag=b.readUInt32LE(s+28);if(tag<4001||tag>4010)continue;
    const dir=[b.readDoubleLE(s+4),b.readDoubleLE(s+12),b.readDoubleLE(s+20)];
    if(!dir.every(Number.isFinite))continue;
    const L=Math.hypot(...dir);if(Math.abs(L-1)>1e-6&&L!==0)continue;
    const cnt=b.readUInt32LE(s+96);if(cnt>10000)continue;
    hits.push({at:s,rawId:b.readUInt32LE(s),tag,count:cnt});
  }
  return hits;
}
const out={};
const targets={bad:['test files online/2019/7765d286_NSJ8L.SLDPRT','test files online/2018/eefa906d_plancher Dalle 2020.SLDPRT','test files online/2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT'],
 good:['test files online/2023/2f121983_case.SLDPRT','test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT']};
for(const kind of Object.keys(targets))for(const rel of targets[kind]){
  const buf=fs.readFileSync(ROOT+rel),d=S.parse(buf),b=dlOf(buf);
  const rec={faces:d.faces.length,perFace:[],summary:{}};
  let found=0,sameAsReader=0,none=0,multi=0,readerOk=0;
  d.faces.forEach((F,i)=>{
    const end=d.faces[i+1]?d.faces[i+1].offset:b.length;
    const h=find(b,F.geometryEnd,end);
    const readerAt=F.metadata?F.metadata.offset-28:null;
    if(F.metadata&&kind==='good'){readerOk++;if(h.some(x=>x.at===readerAt&&x.tag===F.metadata.typeTag))sameAsReader++;}
    if(h.length)found++;else none++;if(h.length>1)multi++;
    if(i<400)rec.perFace.push({i,geomEnd:F.geometryEnd,end,readerAt,readerTag:F.metadata?F.metadata.typeTag:null,hits:h.slice(0,3).map(x=>({rel:x.at-F.geometryEnd,rawId:x.rawId,tag:x.tag,count:x.count}))});
  });
  rec.summary={facesWithHit:found,facesNoHit:none,facesMultiHit:multi,readerParsedFaces:readerOk,hitAtReaderOffsetWithSameTag:sameAsReader};
  out[kind+':'+path.basename(rel)]=rec;
}
fs.writeFileSync(path.join(__dirname,'scan.json'),JSON.stringify(out,null,1)+'\n');
for(const k in out)console.log(k,JSON.stringify(out[k].summary));
