// research harness: run the reader on one file, print each object as it is read, stop at the first gap
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const {Reader,READ}=require('./archive');require('./classes');
const f=process.argv[2],limit=+(process.argv.slice(3).find(a=>/^\d+$/.test(a))||1e9),quiet=process.argv.includes('-q');
const all=P.streams(fs.readFileSync(f));const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));const b=all[k];
const modern=b.readUInt16LE(2)!==0xffff;   // SW2011 streams start u16 count then the first class tag
const start=modern?b.readUInt32LE(0):0;
// pre-loaded classes by role (their indices come from Config-0's archive and vary per file)
const pre={};const role=(name,off,label)=>{const i=b.indexOf(Buffer.from(name));if(i<0)return;const w=b.readUInt16LE(i+name.length+off);if((w&0x8000)&&(w&0x7fff)<start)pre[w&0x7fff]=label;};
role('moCommentsFolder_c',0,'@node');role('moCompFeature_c',0,'@comp');
{const i=b.indexOf(Buffer.from('sgPointHandle'));if(i>0){const w=b.readUInt16LE(i+37);if((w&0x8000)&&(w&0x7fff)<start)pre[w&0x7fff]='@oblist';}}
const r=new Reader(b,start,pre);r.p=modern?4:0;
const head=modern?{u32:b.readUInt32LE(0)}:{};
if(process.env.SYNC){const [off,idx]=process.env.SYNC.split(':').map(Number);r.p=off;r.next=idx;}
try{
  if(!process.env.SYNC)head.count=r.u16();
  const n=Math.min(limit,head.count!==undefined?head.count:1e9);
  const tops=[];
  for(let i=0;i<n;i++){if(r.p>=b.length)break;const o=r.object('top');tops.push(o);if(o&&o.ref!==undefined&&!process.env.LOOSE)throw Error('top-level object '+i+' is '+JSON.stringify(o)+' at '+r.p);if(!quiet)console.log(String(o&&o.at).padStart(6),o&&o.class,o&&o.index,JSON.stringify(o,(k,v)=>['at','index','class','end'].includes(k)?undefined:v).slice(0,400));}
  const rest=b.length-r.p;
  console.log(rest<=2?'END':'STOP: unread bytes:','at',r.p,'of',b.length,'after',n,'top-level slots ('+tops.filter(x=>!x).length+' null); rest',b.subarray(r.p).toString('hex').slice(0,80));
}catch(e){console.log('STOP:',e.message);console.log('classes',[...r.classes.values()].map(c=>c.index+':'+c.name).join(' '));console.log('next index',r.next);console.log('next bytes',b.subarray(r.p,r.p+96).toString('hex'));}
