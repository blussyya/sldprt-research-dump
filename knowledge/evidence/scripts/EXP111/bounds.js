'use strict';
// Bounds: user-feature FT vs ModelStamps, core.xml created/modified and the latest Biography snapshot. Template-feature FT vs ModelStamps.
const d=require('./out/survey_all.json');
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
const plaus=t=>t>9.5e8&&t<1.8e9;
let nf=0,tpl=0,tplEqMS=0,tplDiff={};const rows=[];
for(const r of d){if(!r.nodes||r.modelStamps===undefined)continue;
 const tp=r.nodes.filter(n=>plaus(n.t)&&n.cv===0&&n.order===101&&n.mv>=15000);   // folders created with the document
 const us=r.nodes.filter(n=>plaus(n.t)&&MODEL.has(n.cls));
 // templates: group by identical FT; the latest one is the doc-creation moment
 if(tp.length){const mx=Math.max(...tp.map(n=>n.t));tpl++;const dd=Math.floor(mx)-r.modelStamps;tplDiff[dd]=(tplDiff[dd]||0)+1;}
 if(!us.length)continue;nf++;
 const first=Math.min(...us.map(n=>n.t)),last=Math.max(...us.map(n=>n.t));
 const bio=(r.bio||[]).filter(plaus);const bmax=bio.length?Math.max(...bio):null;
 rows.push({file:r.file,ms:r.modelStamps,first,last,core0:r.created&&Date.parse(r.created)/1000,core1:r.modified&&Date.parse(r.modified)/1000,bmax,
   firstMinusMS:first-r.modelStamps,coreModMinusLast:r.modified?Date.parse(r.modified)/1000-last:null,bioMinusLast:bmax?bmax-last:null});}
console.log('files with user features + ModelStamps',nf);
const q=(a)=>{a=a.filter(x=>x!==null&&isFinite(x)).sort((x,y)=>x-y);return a.length?{n:a.length,min:a[0].toFixed(2),med:a[a.length>>1].toFixed(2),max:a[a.length-1].toFixed(2)}:null};
console.log('first user FT - ModelStamps',q(rows.map(r=>r.firstMinusMS)),'negative:',rows.filter(r=>r.firstMinusMS<-1).length);
console.log('core.modified - last FT',q(rows.map(r=>r.coreModMinusLast)),'negative:',rows.filter(r=>r.coreModMinusLast<-1).length);
console.log('last Biography snapshot - last FT',q(rows.map(r=>r.bioMinusLast)),'negative:',rows.filter(r=>r.bioMinusLast<-1).length);
console.log('template-folder FT floor - ModelStamps (files)',tpl,tplDiff);
for(const r of rows.filter(r=>r.firstMinusMS<-1))console.log('BEFORE MS',r.file,'first-MS',r.firstMinusMS.toFixed(0),'s');
