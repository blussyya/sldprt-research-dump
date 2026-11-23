'use strict';
// SW2011 control, user features only (created.version>0 i.e. not template): offset of node FT from log Created and Modified.
const r=require('./out/log2011.json');const all=require('./out/survey_all.json');
const key=Object.fromEntries(all.filter(x=>/SW2011\/C\d\d/.test(x.file)).map(x=>[x.file.split('/')[2],x]));
const tally={};let n=0;const bad=[];
for(const x of r){const sv=key[x.d];const cv=new Map(sv.nodes.map(m=>[m.name,m.cv]));const L=new Map(x.logs.map(l=>[l.name,l]));
 for(const nd of x.nodes){if(!(cv.get(nd.name)>0))continue;const l=L.get(nd.name);if(!l){bad.push([x.d,nd.name,'no log']);continue;}
  const C=(l.stamps.find(s=>s.what==='Created')||{}).time,M=(l.stamps.find(s=>s.what==='Modified')||{}).time;const last=Math.max(C,M===undefined?0:M);
  const f=Math.floor(nd.t);const kind=/^Sketch/.test(nd.name)?'sketch':'feature';
  const key2=kind+' FT-lastStamp='+(f-last)+' hasModified='+(M!==undefined);tally[key2]=(tally[key2]||0)+1;n++;}}
console.log(n,tally,bad);
