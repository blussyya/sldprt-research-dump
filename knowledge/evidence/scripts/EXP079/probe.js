// research harness: run the reader on one file, print each object as it is read, stop at the first gap
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const {Reader,READ}=require('./archive');require('./classes');
const f=process.argv[2],limit=+(process.argv[3]||1e9),quiet=process.argv.includes('-q');
const all=P.streams(fs.readFileSync(f));const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));const b=all[k];
const modern=b.readUInt16LE(2)!==0xffff;   // SW2011 streams start u16 count then the first class tag
const r=new Reader(b,modern?b.readUInt32LE(0)+3:0);r.p=modern?4:0;
const head=modern?{u32:b.readUInt32LE(0)}:{};
try{
  head.count=r.u16();
  for(let i=0;i<limit;i++){if(r.p>=b.length)break;const o=r.object('top');if(!quiet)console.log(String(o&&o.at).padStart(6),o&&o.class,o&&o.index,JSON.stringify(o,(k,v)=>['at','index','class','end'].includes(k)?undefined:v).slice(0,400));}
  console.log('END at',r.p,'of',b.length);
}catch(e){console.log('STOP:',e.message);console.log('next bytes',b.subarray(r.p,r.p+96).toString('hex'));}
