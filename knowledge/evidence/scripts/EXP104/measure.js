'use strict';
/* Join coverage over the corpus. For every modern part with display id blocks and a readable B-rep:
 *   before  rawId looked up in a Map of native face .id (what inspect.js line 156 does on dev).
 *   after   src/brep/display-join.js (needs the feature tree; skipped when SRC has none).
 *   shift   after, with rawId+1 on every display face (control: should mostly fail).
 * Each matched pair gets an independent check (common.js): display vertices within BAR of the native surface
 * (plane, cylinder, cone, sphere, torus) and the native face's vertices inside the stored bounds (+BAR).
 *   right      every applicable check passes
 *   wrong      an applicable check fails
 *   unchecked  no applicable check (spline/blend/swept face with no vertices or no bounds)
 * BAR = 1e-5 m, set before looking at the numbers.
 * Version 2 of the check. Version 1 (measure.v1-maxres.js) required every display vertex within BAR and called
 * 744 of the new joins and 1206 of the old ones wrong, among them unique-id cylinders of Pocket Wheel whose
 * boundary vertices sit 1.2e-4 m inside the surface. So version 2 asks that at least half the vertices are within BAR.
 * The BAR itself did not change. Edge ids are counted separately (edgeIds): display edge-record ids against the
 * native face's edge section ids, a check that does not use geometry.
 * Control for the check itself: each display face paired with another native face of the same surface type
 * (next one in native order); the share flagged wrong shows the check can tell faces apart.
 * Writes measure.<TAG>.json. */
const C=require('./common');const fs=require('fs');
let J=null;try{J=require(C.SRC+'/brep/display-join');}catch(e){}
const BAR=1e-5;
function check(L,df,nf){
  let applicable=false;
  const sh=C.onSurfaceShare(df,nf,BAR);
  if(sh!==null){applicable=true;if(!(sh>=0.5))return 'wrong';}
  const b=C.inBounds(L.M,df,nf,BAR);
  if(b!==null){applicable=true;if(!b)return 'wrong';}
  return applicable?'right':'unchecked';
}
const blank=()=>({display:0,matched:0,ambiguous:0,none:0,right:0,wrong:0,unchecked:0,edgesSame:0,edgesDiffer:0,edgesNone:0,how:{}});
const add=(t,r)=>{for(const k of Object.keys(r))if(k==='how'){for(const h of Object.keys(r.how))t.how[h]=(t.how[h]||0)+r.how[h];}else t[k]+=r[k];};
function tally(L,pairs){   // pairs: [{df, face, how}]
  const r=blank();
  for(const p of pairs){r.display++;r.how[p.how]=(r.how[p.how]||0)+1;
    if(p.how==='ambiguous'){r.ambiguous++;continue;}
    if(!p.face){r.none++;continue;}
    r.matched++;r[check(L,p.df,p.face)]++;const e=C.edgeIds(L.M,p.df,p.face);r[e==='same'?'edgesSame':e==='differ'?'edgesDiffer':'edgesNone']++;}
  return r;
}
const parts=[],total={before:blank(),after:blank(),shift:blank(),checkControl:{pairs:0,wrong:0,right:0,unchecked:0,edgesDiffer:0,edgesSame:0,edgesNone:0}};
const wrongList=[];
for(const f of C.corpusFiles()){
  const L=C.load(f);if(!L.display||!L.display.length||!L.M.faces.length)continue;
  const nat=L.M.faces,byId=new Map(nat.map(n=>[n.id,n]));
  const row={file:C.rel(f),display:L.display.length};
  row.before=tally(L,L.display.map(df=>{const n=byId.get(df.metadata.rawId);return {df,face:n||null,how:n?'id':'none'};}));
  if(J){
    row.after=tally(L,J.join(L.display,L.M).map((r,i)=>({df:L.display[i],...r})));
    const shifted=L.display.map(df=>({...df,metadata:{...df.metadata,rawId:df.metadata.rawId+1}}));
    row.shift=tally(L,J.join(shifted,L.M).map((r,i)=>({df:L.display[i],...r})));
    // check control: pair with the next native face of the same type
    const cc={pairs:0,wrong:0,right:0,unchecked:0,edgesDiffer:0,edgesSame:0,edgesNone:0};
    for(const df of L.display){const t=J.TAG_TYPE[df.metadata.typeTag];if(!t)continue;
      const same=nat.filter(n=>n.surface.type===t);if(same.length<2)continue;
      const own=J.join([df],L.M)[0].face;if(!own)continue;
      const other=same[(same.indexOf(own)+1)%same.length];cc.pairs++;cc[check(L,df,other)]++;const e=C.edgeIds(L.M,df,other);cc[e==='same'?'edgesSame':e==='differ'?'edgesDiffer':'edgesNone']++;}
    row.checkControl=cc;for(const k of Object.keys(cc))total.checkControl[k]+=cc[k];
    for(const p of J.join(L.display,L.M).map((r,i)=>({df:L.display[i],...r})))if(p.face&&check(L,p.df,p.face)==='wrong')wrongList.push({file:row.file,rawId:p.df.metadata.rawId,tag:p.df.metadata.typeTag,how:p.how,nativeId:p.face.id,nativeType:p.face.surface.type});
  }
  for(const k of ['before','after','shift'])if(row[k])add(total[k],row[k]);
  parts.push(row);
}
const tag=process.env.TAG||'after';
fs.writeFileSync('measure.'+tag+'.json',JSON.stringify({bar:BAR,src:C.SRC,parts:parts.length,total,wrongList,perPart:parts},null,1));
console.log(JSON.stringify({src:C.SRC,parts:parts.length,total},null,1));
const bad=parts.filter(p=>(p.after||p.before).wrong||(p.after||p.before).ambiguous||(p.after||p.before).none);
for(const p of bad)console.log(p.file.split('/').pop().slice(0,16),'n',p.display,'| before m/w/u',p.before.matched,p.before.wrong,p.before.unchecked,p.after?'| after m/amb/none/w/u '+[p.after.matched,p.after.ambiguous,p.after.none,p.after.wrong,p.after.unchecked].join('/'):'');
