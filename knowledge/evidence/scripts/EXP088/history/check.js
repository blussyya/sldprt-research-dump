'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const P=require(path.join(process.env.SLDPRT_CONVERTER||path.resolve(__dirname,'../../../../../../solidworks-converters'),'src/parasolid/partition')),H=require(path.join(process.env.SLDPRT_CONVERTER||path.resolve(__dirname,'../../../../../../solidworks-converters'),'src/container/history')),{parse}=require('./biography');
const root=path.resolve(__dirname,'../../../../..');
const cases=['test files new/SW2011/C22_cube_sw2011_native/model.SLDPRT','test files new/SW2022/C23_cube_sw2011_to_2022/model.SLDPRT','test files new/SW2022/C24_cube_sw2022_native/model.SLDPRT','test files online/2013/82981f2a_head_back.sldprt','test files original/Helical Bevel Gear.SLDPRT'];
const rows=[],buffers=[];
for(const file of cases){
 const streams=P.streams(fs.readFileSync(path.join(root,file))),find=suffix=>Buffer.from(streams[Object.keys(streams).find(n=>n.endsWith(suffix))]);
 const b=find('Biography'),q=parse(b),history=H.parseHistory(find('History'));
 const historyPairs=new Set(history.map(h=>h.version+':'+(h.date.year*1000+h.date.day)));
 const matched=q.records.map(r=>historyPairs.has(r.words[0]+':'+r.words[1]));
 assert(matched.every(Boolean),file+' release/build differs from History');
 const stamp=find('ModelStamps').readUInt32LE(0);
 const times=q.records.flatMap(r=>r.snapshots.map(s=>Number((BigInt(s.timeHigh)*4294967296n+BigInt(s.timeLow))/10000000n-11644473600n)));
 rows.push({file,bytes:b.length,records:q.count,releaseAndBuildMatchHistory:matched,modelStampTime:stamp,snapshotMatchesModelStamp:times.includes(stamp)});buffers.push(b);
}
assert(buffers[0].subarray(23).equals(buffers[1].subarray(23,buffers[0].length)),'upgrade did not preserve first two records');
let rejected=0;const b=buffers[0];
for(let n=0;n<b.length;n++){assert.throws(()=>parse(b.subarray(0,n)));rejected++;}
const extra=Buffer.concat([b,Buffer.from([0])]);assert.throws(()=>parse(extra));rejected++;
const count=Buffer.from(b);count.writeUInt32LE(10001,19);assert.throws(()=>parse(count));rejected++;
const badClass=Buffer.from(b);badClass[6]=88;assert.throws(()=>parse(badClass));rejected++;
console.log(JSON.stringify({rows,upgradePreservesOldRecords:true,corruptionsRejected:rejected},null,2));
