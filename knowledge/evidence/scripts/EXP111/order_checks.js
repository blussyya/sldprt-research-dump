'use strict';
// (1) Created (History stamp) vs feature id order: ids are allocated at creation, so stamps should not decrease with id.
// (2) Modified (FT) vs the node 'order' counter, and Created vs the same counter (should not be monotone if 'order' tracks modification).
const items=require('./out/history_items.json');const sv=require('./out/survey_all.json');
const byFile={};for(const i of items)(byFile[i.file]=byFile[i.file]||[]).push(i);
let pairs=0,inv=0,files=0;
for(const f of Object.keys(byFile)){const a=byFile[f].sort((x,y)=>x.id-y.id);if(a.length<2)continue;files++;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){pairs++;if(a[i].stamp>a[j].stamp)inv++;}}
console.log('(1) Created vs id: files',files,'pairs',pairs,'inversions',inv);
const ord=new Map();for(const r of sv)for(const n of r.nodes||[])ord.set(r.file+'#'+n.id,n.order);
let p2=0,i2=0,p3=0,i3=0,eqs=0;
for(const f of Object.keys(byFile)){const a=byFile[f].map(x=>({...x,order:ord.get(x.file+'#'+x.id)})).filter(x=>x.order!==undefined).sort((x,y)=>x.order-y.order);
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(a[i].order===a[j].order)continue;p2++;if(a[i].t>a[j].t)i2++;p3++;if(a[i].stamp>a[j].stamp)i3++;}}
console.log('(2) Modified (FT) vs order counter: pairs',p2,'inversions',i2,'| Created (stamp) vs order counter: pairs',p3,'inversions',i3);
// whole-corpus FT vs order for modelled features, including files without History
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
let p4=0,i4=0,ties=0;for(const r of sv){if(!r.nodes)continue;const a=r.nodes.filter(n=>n.t>9.5e8&&(MODEL.has(n.cls)||(n.cls==='moRefPlane_c'&&n.cv>0))).sort((x,y)=>x.order-y.order);
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){if(a[i].order===a[j].order){ties++;continue;}p4++;if(a[i].t>a[j].t)i4++;}}
console.log('(3) FT vs order counter, all modelled features + user planes: pairs',p4,'inversions',i4,'ties skipped',ties);
// (4) FT vs feature id (creation order): FT should break id order where a feature was edited late.
let p5=0,i5=0;const where=[];for(const r of sv){if(!r.nodes)continue;const a=r.nodes.filter(n=>n.t>9.5e8&&(MODEL.has(n.cls)||(n.cls==='moRefPlane_c'&&n.cv>0))).sort((x,y)=>x.id-y.id);
 let fi=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){p5++;if(a[i].t>a[j].t){i5++;fi++;}}if(fi)where.push(r.file.split('/').pop().slice(0,40)+' '+fi);}
console.log('(4) FT vs feature id: pairs',p5,'inversions',i5,where);
