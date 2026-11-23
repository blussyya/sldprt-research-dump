'use strict';
// Which bytes of the 54-byte node tail vary between modelled features across the corpus? Negative control for the FILETIME offset.
const {load}=require('../EXP079/load');const {walk,ft}=require('./survey_nodes');
const fs=require('fs'),path=require('path');
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
const root='/home/user/sldprt-research-dump';
function wf(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?wf(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
const {nodes}=require('./survey_nodes');
const vals=Array.from({length:54},()=>new Map());let n=0;const other={e:new Set(),g:new Set(),mx:new Set(),h:new Set(),str2:new Set()};
for(const f of ['test files new','test files original','test files online'].flatMap(d=>wf(path.join(root,d)))){
 let rows;try{rows=nodes(f).rows;}catch(e){continue;}
 for(const r of rows.filter(r=>MODEL.has(r.cls))){const b=Buffer.from(r.tail,'hex');n++;for(let i=0;i<54;i++)vals[i].set(b[i],(vals[i].get(b[i])||0)+1);other.e.add(r.e);other.g.add(r.g);other.mx.add(r.modified.x);other.h.add(r.h);other.str2.add(r.str2);}}
console.log('modelled features',n);
console.log('tail bytes with more than one value:',vals.map((m,i)=>[i,m.size]).filter(x=>x[1]>1).map(x=>x[0]+'('+x[1]+')').join(' '));
console.log('distinct e',other.e.size,'g',other.g.size,'modified.x',[...other.mx].slice(0,5),'h',[...other.h],'str2',other.str2.size);
