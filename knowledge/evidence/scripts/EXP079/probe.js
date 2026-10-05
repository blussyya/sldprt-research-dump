// research harness: run the reader on one file, print each object as it is read, stop at the first gap
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const {Reader,READ}=require('./archive');require('./classes');
const f=process.argv[2],limit=+(process.argv.slice(3).find(a=>/^\d+$/.test(a))||1e9),quiet=process.argv.includes('-q');
const all=P.streams(fs.readFileSync(f));const k=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));const b=all[k];
const modern=b.readUInt16LE(2)!==0xffff;   // SW2011 streams start u16 count then the first class tag
// pre-loaded classes by role (their indices come from Config-0's archive and vary per file)
const pre={};const role=(name,off,label)=>{const i=b.indexOf(Buffer.from(name));if(i<0)return;const w=b.readUInt16LE(i+name.length+off);if(w&0x8000)pre[w&0x7fff]=label;};
role('moCommentsFolder_c',0,'@node');role('moCompFeature_c',0,'@comp');
{const i=b.indexOf(Buffer.from('sgPointHandle'));if(i>0){const w=b.readUInt16LE(i+37);if(w&0x8000)pre[w&0x7fff]='@oblist';}}

// one pass of the reader from a given first index; returns how far it got
function run(start,print){
  const r=new Reader(b,start,pre);r.p=modern?4:0;r.legacy=!modern;
  const head=modern?{u32:b.readUInt32LE(0)}:{};
  if(process.env.SYNC){const [off,idx]=process.env.SYNC.split(':').map(Number);r.p=off;r.next=idx;}
  const res={r,start};
  try{
    if(!process.env.SYNC)head.count=r.u16();
    const n=Math.min(limit,head.count!==undefined?head.count:1e9);
    const tops=[];
    for(let i=0;i<n;i++){if(r.p>=b.length)break;const o=r.object('top');tops.push(o);if(o&&o.class===undefined&&!process.env.LOOSE)throw Error('top-level object '+i+' is '+JSON.stringify(o)+' at '+r.p);if(print&&!quiet)console.log(String(o&&o.at).padStart(6),o&&o.class,o&&o.index,JSON.stringify(o,(k,v)=>['at','index','class','end'].includes(k)?undefined:v).slice(0,400));}
    const rest=b.length-r.p;res.end=rest<=2;
    res.msg=(rest<=2?'END':'STOP: unread bytes:')+' at '+r.p+' of '+b.length+' after '+n+' top-level slots ('+tops.filter(x=>!x).length+' null); rest '+b.subarray(r.p).toString('hex').slice(0,80);
  }catch(e){res.err=e;res.msg='STOP: '+e.message;}
  return res;
}

// The first index. SW2022 writes it as the stream's first u32. SW2011 doesn't: the sequence just carries on
// from Config-0's archive, so it is where that archive's index sequence ends (config0.js reads it). The
// fallback (forced with INFER=1, used when Config-0 can't be read) recovers it from the stream itself: read
// with a provisional first index above every pre-loaded class; the first class or object index the reader
// doesn't know must name one of the stream's own entries, so each of those gives a candidate, and the
// candidate that reads furthest is the first index. Both agree on all 25 SW2011 models.
let res;
if(modern)res=run(b.readUInt32LE(0),true);
else if(process.env.START)res=run(+process.env.START,true);
else if(!process.env.INFER&&(()=>{try{const c0=all[Object.keys(all).find(x=>/Config-0$/.test(x))];const c=require('./config0').readConfig0(c0);if(c.end){res=run(c.next,true);console.log('first index (from Config-0)',c.next);return true;}}catch(_){}return false;})()){}
else{
  const S0=0x1000;const t=run(S0,false);
  const m=t.err&&/unknown class index (\d+)|"ref":(\d+)\}/.exec(t.err.message);
  if(t.end||!m)res=run(S0,true);
  else{
    const kk=+(m[1]||m[2]);let best=null;
    const local=[...t.r.classes.values()].map(c=>c.index-S0).concat(m[2]?[...t.r.objects.keys()].map(i=>i-S0):[]);
    for(const l of new Set(local)){const s=kk-l;if(s<=Math.max(0,...Object.keys(pre).map(Number)))continue;const q=run(s,false);if(!best||!!q.end>!!best.end||(!!q.end===!!best.end&&q.r.p>best.r.p))best=q;}
    res=best?run(best.start,true):run(S0,true);
    console.log('first index (inferred)',res.start);
  }
}
console.log(res.msg);
if(res.err){const r=res.r;console.log('classes',[...r.classes.values()].map(c=>c.index+':'+c.name).join(' '));console.log('next index',r.next);console.log('next bytes',b.subarray(r.p,r.p+96).toString('hex'));}
