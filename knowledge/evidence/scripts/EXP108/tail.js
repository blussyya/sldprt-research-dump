'use strict';
// EXP108: bytes between the end of a face's edge table (metadata.end) and the next face record.
const fs=require('fs'),path=require('path');
const CONV='/home/user/conv-dev/src',S=require(CONV),modern=require(CONV+'/container/modern'),inflate=require(CONV);
const f=process.argv[2];
const buf=new Uint8Array(fs.readFileSync(f));
const st=modern.decompressOpenSX(buf,inflate.inflateRaw,inflate.inflateZlib);
const key=Object.keys(st).find(k=>/DisplayLists/i.test(k));
let dl=st[key];console.log(key,dl.length);
const d=S.parse(f);
const fs_=d.faces;
for(let i=0;i<Math.min(+process.argv[3]||6,fs_.length-1);i++){
  const a=fs_[i];if(!a.metadata)continue;
  const end=a.metadata.end,nx=fs_[i+1].offset;
  console.log('face',i,'edges',a.metadata.edgeRecords.length,'tail len',nx-end,'tag',a.metadata.typeTag);
  console.log(Buffer.from(dl.slice(end,Math.min(nx,end+160))).toString('hex').replace(/(.{8})/g,'$1 '));
}
