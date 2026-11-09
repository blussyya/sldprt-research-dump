#!/usr/bin/env node
'use strict';
/* EXP-099 step 4: loosest scan. Any u32 in 4001..4010 at any byte offset inside a face record
 * (geometryEnd .. next record), no neighbour checks. Control: good parts hit at the reader's tag offset
 * for every face; the bad parts' count shows whether a tag value is present at all. Writes scan2.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const targets=['test files online/2019/7765d286_NSJ8L.SLDPRT','test files online/2018/eefa906d_plancher Dalle 2020.SLDPRT','test files online/2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT','test files online/2023/2f121983_case.SLDPRT'];
const out={};
for(const rel of targets){
  const buf=fs.readFileSync(ROOT+rel),d=S.parse(buf),b=Buffer.from(S.container.modern.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));
  let facesWith=0,hits=0,atReader=0;const ex=[];
  d.faces.forEach((F,i)=>{const end=d.faces[i+1]?d.faces[i+1].offset:b.length;let h=[];
    for(let s=F.geometryEnd;s+4<=end;s++){const v=b.readUInt32LE(s);if(v>=4001&&v<=4010)h.push(s-F.geometryEnd);}
    if(h.length)facesWith++;hits+=h.length;if(F.metadata&&h.includes(F.metadata.offset-F.geometryEnd))atReader++;
    if(h.length&&ex.length<5)ex.push({i,rel:h});});
  out[path.basename(rel)]={faces:d.faces.length,facesWithAnyTagValue:facesWith,hits,hitsAtReaderOffset:atReader,examples:ex};
}
fs.writeFileSync(path.join(__dirname,'scan2.json'),JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out));
