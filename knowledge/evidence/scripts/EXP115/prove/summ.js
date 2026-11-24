const o=require('./corpus_out.json');
for(const r of o){
  if((r.fanFailOnOk||[]).length)console.log('FANFAILONOK',r.file,r.ole,JSON.stringify(r.fanFailOnOk));
  if(r.ole&&r.simpleBad&&r.simpleBad.length&&!/chainwheel/.test(r.file))console.log('OLEBAD',r.file,JSON.stringify(r.simpleBad));
}
const m=o.filter(r=>!r.ole);let n=0,okc=0,once=0,lc={};
for(const r of m)for(const b of r.simpleBad||[]){n++;if(b.fan.ok)okc++;if(b.fan.once)once++;}
console.log('modern bad',n,'fan ok',okc,'once',once);
const sha=new Map();for(const r of o){if(!sha.has(r.sha))sha.set(r.sha,[]);sha.get(r.sha).push(r.file);}
console.log('unique files',sha.size,'dups',[...sha.values()].filter(v=>v.length>1).map(v=>v.length));
const ch=o.find(r=>/chainwheel/.test(r.file));console.log('chainwheel',ch.faces,ch.simpleBad.length,ch.simpleBad.filter(b=>b.fan.ok).length,JSON.stringify(ch.simpleBad.slice(0,2)));
