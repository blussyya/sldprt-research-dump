'use strict';
/* Does display face order follow body order? Claim to break: "display faces come grouped by body, bodies in
 * node-index order, and inside a body in native face order". Tested only on display faces whose
 * (displayId, surface type) names exactly one native face, so no guess feeds the test.
 * Per part: body ranks of those faces in display order; count descents (a face whose body is earlier than the
 * previous one's), count of distinct runs per body, and descents inside a body of the native face order.
 * Control: the same counts on a seeded shuffle of the display order, which must show many descents. */
const C=require('./common');const fs=require('fs');
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const rows=[];
for(const f of C.corpusFiles()){
  const L=C.load(f);if(!L.display)continue;
  const nat=L.M.faces,bodies=[...new Set(nat.map(n=>n.body))].sort((a,b)=>a-b),rank=new Map(bodies.map((b,i)=>[b,i]));
  const pos=new Map(nat.map((n,i)=>[n,i]));
  const byDisp=new Map();for(const n of nat){(byDisp.get(n.displayId)||byDisp.set(n.displayId,[]).get(n.displayId)).push(n);}
  const seq=[];
  for(const d of L.display){
    const c=(byDisp.get(d.metadata.rawId)||[]).filter(n=>n.surface.type===C.TAGTYPE[d.metadata.typeTag]);
    if(c.length===1)seq.push({b:rank.get(c[0].body),p:pos.get(c[0])});
  }
  if(bodies.length<2||seq.length<2)continue;
  const stat=s=>{let bodyDesc=0,inDesc=0;const runs=new Set();let runCount=0,prev=-1;
    for(let i=0;i<s.length;i++){if(i&&s[i].b<s[i-1].b)bodyDesc++;if(i&&s[i].b===s[i-1].b&&s[i].p<s[i-1].p)inDesc++;if(s[i].b!==prev){runCount++;prev=s[i].b;}}
    return {bodyDesc,inDesc,runs:runCount};};
  const sh=seq.map(x=>x);for(let i=sh.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[sh[i],sh[j]]=[sh[j],sh[i]];}
  rows.push({file:C.rel(f),bodies:bodies.length,unique:seq.length,display:L.display.length,...stat(seq),control:stat(sh)});
}
fs.writeFileSync('order.'+(process.env.TAG||'after')+'.json',JSON.stringify(rows,null,1));
const t=(k,o)=>rows.reduce((a,r)=>a+(o?r[o][k]:r[k]),0);
console.log('parts with >1 body:',rows.length,'faces',t('unique'),'| body descents',t('bodyDesc'),'in-body descents',t('inDesc'),'| control body descents',t('bodyDesc','control'),'in-body',t('inDesc','control'));
for(const r of rows)console.log(r.file.split('/').pop().slice(0,14),'bodies',r.bodies,'faces',r.unique,'desc',r.bodyDesc,'inDesc',r.inDesc,'runs',r.runs,'| control',r.control.bodyDesc,r.control.inDesc,r.control.runs);
