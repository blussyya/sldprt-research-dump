'use strict';
// Per file: user-feature FILETIMEs (created.version>0 or order>101) vs order, bounds from ModelStamps, core.xml, Biography.
const d=require('./out/survey_all.json');
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
const plaus=t=>t>9.5e8&&t<1.8e9;
const rows=[];
for(const r of d){if(!r.nodes)continue;
 const u=r.nodes.filter(n=>plaus(n.t)&&n.cv>0&&MODEL.has(n.cls));
 if(u.length<2)continue;
 const byOrder=[...u].sort((a,b)=>a.order-b.order||a.id-b.id);
 let inv=0,pairs=0;for(let i=0;i<byOrder.length;i++)for(let j=i+1;j<byOrder.length;j++){if(byOrder[i].order===byOrder[j].order)continue;pairs++;if(byOrder[i].t>byOrder[j].t)inv++;}
 const adjInv=byOrder.slice(1).filter((n,i)=>n.t<byOrder[i].t).length;
 const lo=r.modelStamps,hiCore=r.modified?Date.parse(r.modified)/1000:null,loCore=r.created?Date.parse(r.created)/1000:null;
 const bio=r.bio&&r.bio.filter(plaus);const bmax=bio&&bio.length?Math.max(...bio):null;
 const tmin=Math.min(...u.map(n=>n.t)),tmax=Math.max(...u.map(n=>n.t));
 rows.push({file:r.file,modern:r.modern,n:u.length,pairs,inv,adjInv,tmin,tmax,ms:lo,core0:loCore,core1:hiCore,bmax,
  beforeMS:lo!==undefined&&tmin<Math.floor(lo)-1?1:0, afterCore:hiCore&&tmax>hiCore+1?1:0, afterBio:bmax&&tmax>bmax+1?1:0});}
require('fs').writeFileSync('out/analyze2.json',JSON.stringify(rows));
const s=k=>rows.reduce((a,r)=>a+r[k],0);
console.log('files',rows.length,'pairs',s('pairs'),'inversions',s('inv'),'files with inv',rows.filter(r=>r.inv).length,'beforeMS',s('beforeMS'),'afterCore',s('afterCore'),'afterBio',s('afterBio'));
for(const r of rows.filter(r=>r.inv||r.beforeMS||r.afterCore||r.afterBio))console.log(r.file,r.modern,'n',r.n,'inv',r.inv+'/'+r.pairs,'before',r.beforeMS,'afterCore',r.afterCore,'afterBio',r.afterBio);
