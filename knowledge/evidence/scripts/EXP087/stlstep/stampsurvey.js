// Corpus survey: ModelStamps[1] (model change counter) against DLUpdateStamp (display list's counter).
const P=require('/home/user/conv-inspector/src/parasolid/partition.js'),fs=require('fs'),path=require('path');
const R='/home/user/sldprt-research-dump/test files online';const rows=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))rows.push(p);}})(R);
let same=0,behind=[],other=[];
for(const f of rows){let all;try{all=P.streams(fs.readFileSync(f));}catch(e){other.push([f,'read: '+e.message]);continue;}
  const k=Object.keys(all),ms=k.find(x=>/(^|\/)ModelStamps$/.test(x)),dl=k.find(x=>/DLUpdateStamp$/.test(x));
  if(!ms||!dl){other.push([f,'missing '+(!ms?'ModelStamps ':'')+(!dl?'DLUpdateStamp':'')]);continue;}
  const m=Buffer.from(all[ms]),d=Buffer.from(all[dl]);const mv=m.length>=8?m.readUInt32LE(4):null,dv=d.readUInt32LE(0);
  if(mv===dv)same++;else behind.push([path.relative(R,f),'model',mv,'display',dv,'stamps',m.toString('hex')]);}
console.log('files',rows.length,'| display stamp == model stamp:',same,'| differ:',behind.length,'| no stamps:',other.length);
for(const b of behind)console.log('  differ',b.join(' '));
for(const o of other.slice(0,8))console.log('  ',path.relative(R,o[0]),o[1]);
