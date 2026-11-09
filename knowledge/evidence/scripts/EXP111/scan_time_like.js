'use strict';
// Blind scan of the whole ResolvedFeatures stream: every byte offset where a u32 is a unix time inside [ModelStamps, core.modified]
// or a (hi,lo) / (lo,hi) FILETIME pair falls in that window. Lists hits by offset so unknown holders show up.
const fs=require('fs');const P=require('../../../../package/src/parasolid/partition');
const f=process.argv[2];const all=P.streams(fs.readFileSync(f));
const g=s=>all[Object.keys(all).find(k=>k.endsWith(s))];
const rf=g('Config-0-ResolvedFeatures'),ms=g('ModelStamps').readUInt32LE(0);const core=g('docProps/core.xml').toString();
const mod=Date.parse(/modified>([^<]+)/.exec(core)[1])/1000;
console.log('window',new Date((ms-5)*1000).toISOString(),new Date((mod+1)*1000).toISOString(),'stream',rf.length);
const U=[],F=[];
for(let p=0;p+4<=rf.length;p++){const v=rf.readUInt32LE(p);if(v>=ms-5&&v<=mod+1)U.push([p,v-ms]);}
const EPOCH=11644473600;
for(let p=0;p+8<=rf.length;p++){for(const [name,hi,lo] of [['hi-lo',rf.readUInt32LE(p),rf.readUInt32LE(p+4)],['lo-hi',rf.readUInt32LE(p+4),rf.readUInt32LE(p)]]){
  if(hi<0x01d00000||hi>0x01e00000)continue;const t=Number((BigInt(hi)<<32n|BigInt(lo))/10000000n)-EPOCH;if(t>=ms-5&&t<=mod+1)F.push([p,name,t-ms]);}}
console.log('u32 unix hits',U.length,JSON.stringify(U));
console.log('FILETIME hits',F.length,JSON.stringify(F));
