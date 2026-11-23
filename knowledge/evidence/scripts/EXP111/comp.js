'use strict';
// Collect moCompFeature_c (feature id, u32 stamp) with the class of the object that holds it; compare with log (SW2011) and node FT.
const fs=require('fs'),path=require('path');
const {load}=require('../EXP079/load');const {ft,nodes}=require('./survey_nodes');
function walkp(o,parent,f,seen=new Set()){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(o.class)f(o,parent);const p=o.class?o:parent;for(const k of Object.keys(o)){const v=o[k];if(Array.isArray(v))v.forEach(x=>walkp(x,p,f,seen));else if(v&&typeof v==='object')walkp(v,p,f,seen);}}
function comps(file){const t=load(file);const out=[];for(const top of t.tops)walkp(top,null,(o,p)=>{if(o.class==='moCompFeature_c')out.push({feature:o.feature,stamp:o.stamp,holder:p&&p.class,holderName:p&&(p.name||(p.node&&p.node.name))});});return out;}
module.exports={comps};
if(require.main===module){
 const root='/home/user/sldprt-research-dump/test files new/';const log=require('./out/log2011.json');
 for(const gen of ['SW2011','SW2022']){const tally={};const ex=[];
  for(const d of fs.readdirSync(root+gen).filter(x=>/^C\d\d/.test(x))){const f=root+gen+'/'+d+'/model.SLDPRT';
   let c,rows;try{c=comps(f);rows=nodes(f).rows;}catch(e){console.log('ERR',d,e.message);continue;}
   const byId=new Map(rows.map(n=>[n.id,n]));const L=gen==='SW2011'?new Map(log.find(x=>x.d===d).logs.map(l=>[l.k,l])):null;
   for(const x of c){const n=byId.get(x.feature);const h=x.holder;const key=h;
    let rel='no node';if(n){const b=Buffer.from(n.tail,'hex');const t=ft(b.readUInt32LE(46),b.readUInt32LE(50));rel='stamp-floor(FT)='+(t>1e9?x.stamp-Math.floor(t):'FT empty');
     if(L&&L.get(x.feature)){const C=(L.get(x.feature).stamps.find(s=>s.what==='Created')||{}).time;rel+=' stamp-logCreated='+(x.stamp-C);}}
    const k=h+' | '+rel;tally[k]=(tally[k]||0)+1;if(ex.length<6&&/History/.test(h))ex.push([d,x.feature,n&&n.name,x.stamp]);}}
  console.log(gen);console.log(tally);}
}
