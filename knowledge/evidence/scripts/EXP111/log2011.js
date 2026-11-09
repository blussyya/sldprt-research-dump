'use strict';
// SW2011 control: read each feature's Created/Modified unix times from the Config-0 feature log and compare with the ResolvedFeatures node tail FILETIME.
const fs=require('fs'),path=require('path');
const P=require('../../../../package/src/parasolid/partition');
const {readConfig0}=require('../EXP079/config0');
const {nodes,ft}=require('./survey_nodes');
const root='/home/user/sldprt-research-dump/test files new/SW2011';
const res=[];
for(const d of fs.readdirSync(root).filter(x=>/^C\d\d/.test(x))){
 const f=path.join(root,d,'model.SLDPRT');
 const all=P.streams(fs.readFileSync(f));const c0=all[Object.keys(all).find(x=>/Config-0$/.test(x))];
 let c;try{c=readConfig0(c0);}catch(e){res.push({d,err:e.message});continue;}
 const logs=(c.part&&c.part.header&&c.part.header.logs&&c.part.header.logs.items)||[];
 const {rows}=nodes(f);
 const row={d,logs:logs.map(l=>({name:l.name,k:l.k,stamps:l.stamps.map(s=>({what:s.what,time:s.time,a:s.a,b:s.b}))})),nodes:rows.map(n=>{const b=Buffer.from(n.tail,'hex');return {id:n.id,name:n.name,t:ft(b.readUInt32LE(46),b.readUInt32LE(50))};})};
 res.push(row);
}
fs.writeFileSync('out/log2011.json',JSON.stringify(res,null,1));
console.log(res.length,res.filter(r=>r.err).map(r=>r.d+':'+r.err));
