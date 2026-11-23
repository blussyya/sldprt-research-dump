'use strict';
const {Reader}=require('../../EXP079/archive');
function parse(b){
 b=Buffer.from(b);const r=new Reader(b,1);r.expect(65535,r.u16(),'class tag');const schema=r.u16(),name=r.bytes(r.u16()).toString('ascii');if(name!=='moBiography_c')throw Error('not Biography');
 const count=r.u32();if(count>10000)throw Error('too many records');const records=[];
 for(let i=0;i<count;i++){
  const offset=r.p,words=Array.from({length:9},()=>r.u32()),servicePack=r.str(),locale=r.u16(),snapshots=[];
  for(let j=0;j<2;j++){
   const start=r.p,timeLow=r.u32(),timeHigh=r.u32(),unknown=r.u32(),paths=[];
   for(let k=0;k<6;k++)paths.push({value:r.str(),words:[r.u32(),r.u32(),r.u32()]});
   snapshots.push({offset:start,timeLow,timeHigh,unknown,paths});
  }
  records.push({offset,end:r.p,words,servicePack,locale,snapshots});
 }
 if(r.p!==b.length)throw Error('unread bytes '+(b.length-r.p)+' at '+r.p);
 return {schema,count,records,bytes:r.p};
}
module.exports={parse};
if(require.main===module){const fs=require('fs');console.log(JSON.stringify(parse(fs.readFileSync(process.argv[2])),null,2));}
