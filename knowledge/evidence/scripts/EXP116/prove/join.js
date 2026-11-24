'use strict';
// Join id/tag read by my own reader with native faces (displayId, surface.type). Controls included.
const L=require('./lib');const path=require('path');
const root='/home/user/sldprt-research-dump';
const TAGS={4001:'plane',4002:'cylinder',4003:'cone',4004:'sphere',4005:'torus',4006:'bspline',4007:'blend',4008:'offset',4009:'swept',4010:'spun'};
const files=process.argv.slice(2);
const typeSeen={};
const agg={};const perFile=[];
function bump(g,k,n=1){agg[g]=agg[g]||{};agg[g][k]=(agg[g][k]||0)+n;}
for(const f of files){
  const rel=path.relative(root,f);
  let st,R,faces,ver;
  try{const {dl}=L.dlOf(f);R=L.rd(dl);st=L.faceStarts(dl);
    const info=L.S.info(f);ver=(info.displayListsVersion)+'';
    const m=L.S.brep.model(L.S.readBrep(f).parsed);faces=m.faces;}
  catch(e){perFile.push({rel,err:e.message.slice(0,80)});continue;}
  const byId=new Map();for(const nf of faces){const t=nf.surface.type;typeSeen[t]=(typeSeen[t]||0)+1;if(!byId.has(nf.displayId))byId.set(nf.displayId,[]);byId.get(nf.displayId).push(nf);}
  const ids=new Set(faces.map(x=>x.displayId));const maxId=Math.max(...ids);
  const rec={rel,ver,faces:st.length,native:faces.length,layouts:{}};
  const rows=[];
  for(const B of st){const r=L.readFace(R,B);const lay=r.layout+(r.noBlock?'-noblock':r.bad?'-bad':'');rec.layouts[lay]=(rec.layouts[lay]||0)+1;rows.push({lay,r});}
  // join each layout group
  for(const {lay,r} of rows){
    if(r.id===undefined)continue;
    const g=lay;
    const c=byId.get(r.id);
    bump(g,'withId');bump(g,'w128='+r.w128);if(r.K!==undefined)bump(g,'K='+r.K);bump(g,'flag='+r.flag);
    if(r.tag>=4001&&r.tag<=4010)bump(g,'tagValid');
    if(c){bump(g,'joined');if(c.some(x=>x.surface.type===TAGS[r.tag]))bump(g,'tagEq');else{bump(g,'tagNe');(agg[g].ne=agg[g].ne||[]).length<8&&agg[g].ne.push([rel.split('/').pop(),r.id,r.tag,c.map(x=>x.surface.type).join('/')]);}
      if(c.length>1)bump(g,'dupIdInNative');else bump(g,'uniqueJoin');if(c.length===1&&c[0].surface.type===TAGS[r.tag])bump(g,'uniqueJoinTagEq');if(c.every(x=>x.surface.type===TAGS[r.tag]))bump(g,'tagEqAll');}
    else bump(g,'noJoin');
  }
  // controls on layout C faces only
  const cs=st.map((B,i)=>({B,i})).filter(({i})=>rows[i].lay==='C');
  if(cs.length){
    const rnd=(()=>{let s=12345;return()=>(s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;})();
    for(const {B,i} of cs){
      const r=rows[i].r;
      // control 1: id read 16 bytes later (layout A offsets applied to a C record) -- and 16 earlier
      for(const [name,d] of [['wrongOff+16',16],['wrongOff-16',-16],['wrongOff+4',4],['wrongOff+8',8]]){
        const rr=L.idBlock(R,B+132+d);
        bump('ctrl:'+name,'n');
        if(rr&&!rr.noBlock&&rr.id!==undefined){bump('ctrl:'+name,'parsed');if(byId.has(rr.id)){bump('ctrl:'+name,'joined');if(byId.get(rr.id).some(x=>x.surface.type===TAGS[rr.tag]))bump('ctrl:'+name,'tagEq');}}
      }
      // control 2: ids shifted by one face (next record's id), and random permutation within file
      const nxt=cs[(cs.indexOf(cs.find(x=>x.i===i))+1)%cs.length].i;
      const rn=rows[nxt].r;
      bump('ctrl:nextFaceId','n');const cn=byId.get(rn.id);if(cn){bump('ctrl:nextFaceId','joined');if(cn.some(x=>x.surface.type===TAGS[r.tag]))bump('ctrl:nextFaceId','tagEq');}
      const rj=rows[cs[Math.floor(rnd()*cs.length)].i].r;
      bump('ctrl:randomFaceId','n');const cj=byId.get(rj.id);if(cj){bump('ctrl:randomFaceId','joined');if(cj.some(x=>x.surface.type===TAGS[r.tag]))bump('ctrl:randomFaceId','tagEq');}
      // id+1000000 / id+maxId (must not join)
      bump('ctrl:id+maxId','n');if(byId.has(r.id+maxId))bump('ctrl:id+maxId','joined');
      bump('ctrl:id+1','n');const c1=byId.get(r.id+1);if(c1){bump('ctrl:id+1','joined');if(c1.some(x=>x.surface.type===TAGS[r.tag]))bump('ctrl:id+1','tagEq');}
    }
  }
  // positive control: layout A joins too
  perFile.push(rec);
}
console.log(JSON.stringify({typeSeen},null));
for(const p of perFile)console.log(JSON.stringify(p));
console.log(JSON.stringify(agg,null,1));
