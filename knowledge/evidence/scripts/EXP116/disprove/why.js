const fs=require('fs');
const recs=JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/recs.json'));
const t={};
for(const r of recs){
  const g=r.lay+'@'+r.ver;
  let why;
  if(!r.w)why='nowalk-null';
  else if(r.w.err)why='err:'+r.w.err;
  else if(!r.w.res.every(v=>v===0))why='res!=0 '+r.w.res.join(',');
  else if(!(r.w.tag>=4001&&r.w.tag<=4010))why='badtag';
  else why='ok';
  if(r.lay==='C'||r.lay==='A'&&r.ver>=18000||r.lay==='B'){t[g]=t[g]||{};t[g][why]=(t[g][why]||0)+1;}
}
console.log(JSON.stringify(t,null,1));
