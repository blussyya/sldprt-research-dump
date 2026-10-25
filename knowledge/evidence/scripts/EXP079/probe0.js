// Read Config-0 (the configuration archive) and check where its index sequence ends against the first
// index ResolvedFeatures uses: SW2022 writes it as that stream's first u32; for SW2011 load.js recovers it.
// usage: node probe0.js FILE [-v]
const fs=require('fs');const P=require('../../../../package/src/parasolid/partition');
const {Reader}=require('./archive');require('./classes');require('./config0');const {load}=require('./load');
const f=process.argv[2];const all=P.streams(fs.readFileSync(f));const b=all[Object.keys(all).find(x=>/Config-0$/.test(x))];
const legacy=b.indexOf(Buffer.from('moHeader_c'))>=0&&b.indexOf(Buffer.from('moHeader_c'))<40;
const r=new Reader(b,legacy?1:2,{});r.legacy=legacy;
const tops=[];let err=null;
try{while(r.p<b.length){const o=r.object('top');tops.push(o);}}catch(e){err=e;}
const rf=load(f);
console.log((err?'STOP '+err.message:'END')+' at '+r.p+' of '+b.length+'; '+tops.length+' top-level objects; next index '+r.next+'; ResolvedFeatures first index '+rf.start+(r.next===rf.start?' (match)':' (MISMATCH)'));
if(process.argv.includes('-v')){for(const o of tops)console.log(o&&o.class,o&&o.index,o&&o.at);console.log('classes',[...r.classes.values()].map(c=>c.index+':'+c.name).join(' '));}
