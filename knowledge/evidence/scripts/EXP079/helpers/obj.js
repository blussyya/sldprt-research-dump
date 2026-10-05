// run the reader on a file and print one top-level object (by class or name) as JSON, attribute blocks folded
const fs=require('fs');const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');
const {Reader}=require('/home/claude/sldprt-research-dump/knowledge/evidence/scripts/EXP079/archive.js');require('/home/claude/sldprt-research-dump/knowledge/evidence/scripts/EXP079/classes.js');
const [f,want]=process.argv.slice(2);
const b=P.streams(fs.readFileSync(f))['Contents/Config-0-ResolvedFeatures'];const start=b.readUInt32LE(0);
const pre={};const role=(name,off,label)=>{const i=b.indexOf(Buffer.from(name));if(i<0)return;const w=b.readUInt16LE(i+name.length+off);if((w&0x8000)&&(w&0x7fff)<start)pre[w&0x7fff]=label;};
role('moCommentsFolder_c',0,'@node');role('moCompFeature_c',0,'@comp');
{const i=b.indexOf(Buffer.from('sgPointHandle'));if(i>0){const w=b.readUInt16LE(i+37);if((w&0x8000)&&(w&0x7fff)<start)pre[w&0x7fff]='@oblist';}}
const r=new Reader(b,start,pre);r.p=4;const n=r.u16();const out=[];
try{for(let i=0;i<n;i++)out.push(r.object('top'));}catch(e){console.error('STOP',e.message);}
const o=out.find(x=>x&&(x.class===want||x.name===want));
console.log(JSON.stringify(o,(k,v)=>k==='attrs'||k==='node'&&v&&v.tail?(k==='node'?{name:v.name,id:v.id}:'…'):v,1).replace(/\n\s*/g,' '));
module.exports={out};
