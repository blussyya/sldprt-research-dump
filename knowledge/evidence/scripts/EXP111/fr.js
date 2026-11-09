'use strict';
// Collect moFR_c (feature id, stamp) references and compare with log / node FT.
const fs=require('fs'),path=require('path');
const {load}=require('../EXP079/load');
const {walk,ft,nodes}=require('./survey_nodes');
function frs(file){const t=load(file);const out=[];for(const top of t.tops)walk(top,o=>{if(o.class==='moFR_c')out.push({feature:o.feature,stamp:o.stamp});});return out;}
module.exports={frs};
if(require.main===module){
 const root='/home/user/sldprt-research-dump/test files new/';
 const log=require('./out/log2011.json');
 for(const gen of ['SW2011','SW2022']){
  const res=[];
  for(const d of fs.readdirSync(root+gen).filter(x=>/^C\d\d/.test(x))){
   const f=root+gen+'/'+d+'/model.SLDPRT';let list,rows;try{list=frs(f);rows=nodes(f).rows;}catch(e){console.log(gen,d,'ERR',e.message);continue;}
   const byId=new Map(rows.map(n=>[n.id,n]));
   const L=gen==='SW2011'?new Map(log.find(x=>x.d===d).logs.map(l=>[l.k,l])):null;
   const agg={};for(const r of list){const k=r.feature+':'+r.stamp;agg[k]=(agg[k]||0)+1;}
   for(const k of Object.keys(agg)){const [id,st]=k.split(':').map(Number);const n=byId.get(id);let rec={gen,d,id,name:n&&n.name,stamp:st,iso:new Date(st*1000).toISOString(),count:agg[k]};
     if(n){const b=Buffer.from(n.tail,'hex');rec.ft=ft(b.readUInt32LE(46),b.readUInt32LE(50));}
     if(L&&L.get(id)){const l=L.get(id);rec.logC=(l.stamps.find(s=>s.what==='Created')||{}).time;rec.logM=(l.stamps.find(s=>s.what==='Modified')||{}).time;}
     res.push(rec);}
  }
  fs.writeFileSync('out/fr_'+gen+'.json',JSON.stringify(res,null,1));
  console.log(gen,res.length);for(const r of res.filter(r=>/C0[0-8]_/.test(r.d)).slice(0,24))console.log(r.d,r.id,r.name,r.iso,'FT',r.ft&&new Date(r.ft*1000).toISOString(),'logC',r.logC&&new Date(r.logC*1000).toISOString().slice(11,19),'logM',r.logM&&new Date(r.logM*1000).toISOString().slice(11,19));
 }
}
