// Validity of the id/tag block per layout, with shifted-offset controls.
const L=require('./lib'),R=require('./rec');
const stats={};
const S=(k)=>stats[k]||(stats[k]={n:0,noWalk:0,res0:0,tagOK:0,dirOK:0,edgesMatch:0,endLEnxt:0,gap:{},ctrl:{}});
function check(m,o,b1){ // o = block (id at o.idPos); returns flags
  const f={};
  f.res0=o.res.every(v=>v===0);
  f.tagOK=o.tag>=4001&&o.tag<=4010;
  f.dirOK=o.dir.every(Number.isFinite)&&(Math.abs(Math.hypot(...o.dir)-1)<1e-9||Math.hypot(...o.dir)===0);
  const ids=[...new Set(o.edges.map(e=>e[0]))].sort((a,b)=>a-b);
  f.edgesMatch=JSON.stringify(ids)===JSON.stringify(b1)||(!ids.length&&!b1.length);
  return f;
}
// control: re-read the block at idPos+delta
function shifted(m,idPos,d,b1){
  const e=idPos+d;
  const tag=m.u(e+28),cnt=m.u(e+28+68);
  const ok=tag>=4001&&tag<=4010&&cnt!==null&&cnt<1e5;
  if(!ok)return false;
  const ids=[];for(let i=0;i<cnt;i++)ids.push(m.u(e+28+72+8*i));
  const s=[...new Set(ids)].sort((a,b)=>a-b);
  return JSON.stringify(s)===JSON.stringify(b1);
}
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  r.faces.forEach((fc,i)=>{
    const rf=R.readFace(m,fc.geometryEnd);
    const grp=rf.lay+(rf.lay==='A'&&x.ver>=18000?'@'+x.ver:'')+(rf.lay==='C'?'@'+x.ver:'');
    const s=S(grp);s.n++;
    if(!rf.w||rf.w.err){s.noWalk++;return;}
    const b1=[...new Set(fc.edgeAnnotations.map(e=>e.id).filter(v=>v!==0))].sort((a,b)=>a-b);
    const f2=check(m,rf.w,b1);
    for(const k of ['res0','tagOK','dirOK','edgesMatch'])if(f2[k])s[k]++;
    const full=f2.res0&&f2.tagOK&&f2.dirOK&&f2.edgesMatch;
    s.full=(s.full||0)+(full?1:0);
    const nxt=r.faces[i+1]?r.faces[i+1].offset:x.dl.length;
    if(rf.w.end<=nxt){s.endLEnxt++;const g=nxt-rf.w.end;s.gap[g]=(s.gap[g]||0)+1;}
    if(full)for(const d of [-16,-8,-4,4,8,16]){ // control: shifted block must fail
      s.ctrl[d]=(s.ctrl[d]||0)+(shifted(m,rf.w.idPos,d,b1)?1:0);}
  });
}
for(const [k,s] of Object.entries(stats)){
  const gaps=Object.entries(s.gap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e.join(':')).join(' ');
  console.log(k,JSON.stringify({...s,gap:undefined}),'topgaps',gaps);
}
