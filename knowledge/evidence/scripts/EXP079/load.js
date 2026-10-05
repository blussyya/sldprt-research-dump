// Load the feature tree of one .SLDPRT into objects: {start, legacy, count, tops, reader}
// SW2011 files have no first index; it is recovered the same way probe.js does it.
const fs=require('fs');
const P=require('../../../../package/src/parasolid/partition');
const {Reader}=require('./archive');require('./classes');
function load(file){
  const all=P.streams(fs.readFileSync(file));const b=all[Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x))];
  const modern=b.readUInt16LE(2)!==0xffff;
  const pre={};const role=(name,label)=>{const i=b.indexOf(Buffer.from(name));if(i<0)return;const w=b.readUInt16LE(i+name.length);if(w&0x8000)pre[w&0x7fff]=label;};
  role('moCommentsFolder_c','@node');role('moCompFeature_c','@comp');
  const run=start=>{const r=new Reader(b,start,{...pre});r.p=modern?4:0;r.legacy=!modern;const res={r,start,legacy:!modern,tops:[]};
    try{res.count=r.u16();for(let i=0;i<res.count&&r.p<b.length;i++){const o=r.object('top');if(o&&o.class===undefined)throw Error('top-level ref '+JSON.stringify(o)+' at '+r.p);res.tops.push(o);}
      res.end=b.length-r.p<=2;if(!res.end)res.err=Error('unread bytes at '+r.p);}catch(e){res.err=e;}return res;};
  if(modern)return run(b.readUInt32LE(0));
  if(process.env.START)return run(+process.env.START);
  const S0=0x1000,t=run(S0);const m=t.err&&/unknown class index (\d+)|"ref":(\d+)\}/.exec(t.err.message);if(!m)return t;
  const k=+(m[1]||m[2]);let best=null;
  for(const l of new Set([...t.r.classes.values()].map(c=>c.index-S0))){const s=k-l;if(s<=Math.max(0,...Object.keys(pre).map(Number)))continue;const q=run(s);if(!best||!!q.end>!!best.end||(!!q.end===!!best.end&&q.r.p>best.r.p))best=q;}
  return best||t;
}
module.exports={load};
