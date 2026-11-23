'use strict';
// Which modelled features have a History item (Created stamp)? Per file with a History folder.
const fs=require('fs'),path=require('path');const {nodes}=require('./survey_nodes');const {comps}=require('./comp');
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
const root='/home/user/sldprt-research-dump';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
let files=0,hist=0,feat=0,cov=0;const byCls={};const gen={};const missing=[];
for(const f of ['test files new','test files original','test files online'].flatMap(d=>walk(path.join(root,d)))){
 let rows,c;try{rows=nodes(f).rows;c=comps(f).filter(x=>x.holder==='moHistoryFeatItemData_c');}catch(e){continue;}
 const hasFolder=rows.some(n=>n.cls==='moHistoryFolder_c');if(!hasFolder)continue;files++;
 const ids=new Set(c.map(x=>x.feature));const ms=rows.filter(n=>MODEL.has(n.cls));
 const g=/SW2011|C23/.test(f)?'upgraded/2011':'other';gen[g]=gen[g]||{files:0,feat:0,cov:0};gen[g].files++;
 for(const n of ms){feat++;gen[g].feat++;byCls[n.cls]=byCls[n.cls]||{feat:0,cov:0};byCls[n.cls].feat++;if(ids.has(n.id)){cov++;gen[g].cov++;byCls[n.cls].cov++;}else if(missing.length<8)missing.push([path.relative(root,f).slice(-45),n.name,n.cls]);}
}
console.log('files with a History folder',files,'modelled features',feat,'with a History item',cov);console.log(byCls);console.log(gen);console.log(missing);
