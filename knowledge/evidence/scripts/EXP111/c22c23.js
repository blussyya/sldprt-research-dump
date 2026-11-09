'use strict';
const fs=require('fs');const R='/home/user/sldprt-research-dump/test files new/';
const P=require('../../../../package/src/parasolid/partition');const {readConfig0}=require('../EXP079/config0');
const {nodes,ft}=require('./survey_nodes');const {comps}=require('./comp');const {frs}=require('./fr');
const I=t=>new Date(t*1000).toISOString().slice(11,23);
const f22=R+'SW2011/C22_cube_sw2011_native/model.SLDPRT';
const all=P.streams(fs.readFileSync(f22));const c=readConfig0(all[Object.keys(all).find(x=>/Config-0$/.test(x))]);
console.log('C22 ModelStamps',I(all[Object.keys(all).find(x=>/ModelStamps$/.test(x))].readUInt32LE(0)));
for(const l of c.part.header.logs.items)if(l.k>=17)console.log(' log',l.k,l.name,l.stamps.map(s=>s.what+' '+I(s.time)).join(', '));
for(const [lab,f] of [['C22',f22],['C23',R+'SW2022/C23_cube_sw2011_to_2022/model.SLDPRT'],['C24',R+'SW2022/C24_cube_sw2022_native/model.SLDPRT']]){
 console.log(lab);for(const n of nodes(f).rows){if(['moProfileFeature_c','moExtrusion_c'].includes(n.cls)){const b=Buffer.from(n.tail,'hex');console.log('  node',n.id,n.name,'FT',I(ft(b.readUInt32LE(46),b.readUInt32LE(50))));}}
 try{for(const x of comps(f))console.log('  comp',x.holder,x.feature,I(x.stamp));}catch(e){console.log('comps err',e.message);}
 try{for(const x of frs(f))console.log('  FR',x.feature,I(x.stamp));}catch(e){}
}
