'use strict';
/* Exploration: for each modern part with display ids, how do display rawIds sit among native displayId / id / body? */
const C=require('./common');const fs=require('fs');
const rows=[];
for(const f of C.corpusFiles()){
  const L=C.load(f);if(!L.display)continue;
  const nat=L.M.faces;if(!nat.length||!L.display.length)continue;
  const byDisp=new Map();for(const n of nat){(byDisp.get(n.displayId)||byDisp.set(n.displayId,[]).get(n.displayId)).push(n);}
  const byId=new Map(nat.map(n=>[n.id,n]));
  let hasDisp=0,multi=0,hasId=0,typeOk=0;
  for(const d of L.display){const c=byDisp.get(d.metadata.rawId)||[];if(c.length)hasDisp++;if(c.length>1)multi++;if(byId.has(d.metadata.rawId))hasId++;
    if(c.some(n=>n.surface.type===C.TAGTYPE[d.metadata.typeTag]))typeOk++;}
  rows.push({file:C.rel(f),display:L.display.length,native:nat.length,bodies:new Set(nat.map(n=>n.body)).size,hasId,hasDisp,multi,typeOk});
}
fs.writeFileSync('explore.'+(process.env.TAG||'after')+'.json',JSON.stringify(rows,null,1));
const t=k=>rows.reduce((a,r)=>a+r[k],0);
console.log(rows.length,'parts','display',t('display'),'byId',t('hasId'),'byDisplayId',t('hasDisp'),'multi',t('multi'),'typeOk',t('typeOk'));
console.log(rows.filter(r=>r.hasDisp!==r.hasId||r.multi).map(r=>[r.file.split('/').pop().slice(0,12),r.display,r.native,r.bodies,r.hasId,r.hasDisp,r.multi,r.typeOk].join(' ')).join('\n'));
