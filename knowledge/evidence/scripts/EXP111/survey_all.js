'use strict';
// For every part in the corpus: feature-node FILETIME candidates (tail bytes 46..54, hi/lo), ModelStamps, core.xml, Biography times.
const fs=require('fs'),path=require('path');
const {nodes,ft}=require('./survey_nodes');
const P=require('../../../../package/src/parasolid/partition');
const {parse}=require('../EXP088/history/biography');
const root='/home/user/sldprt-research-dump';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.sldprt$/i.test(e.name)?[path.join(dir,e.name)]:[]);}
const files=['test files new','test files original','test files online'].flatMap(d=>walk(path.join(root,d)));
const out=[];
for(const f of files){const row={file:path.relative(root,f)};
 try{const all=P.streams(fs.readFileSync(f));const get=s=>{const k=Object.keys(all).find(x=>x.endsWith(s));return k?all[k]:null;};
  const ms=get('ModelStamps');if(ms)row.modelStamps=ms.readUInt32LE(0);
  const core=get('docProps/core.xml');if(core){const t=core.toString('utf8');row.created=(/created[^>]*>([^<]+)/.exec(t)||[])[1];row.modified=(/modified>([^<]+)/.exec(t)||[])[1];}
  const bio=get('Biography');if(bio){try{const q=parse(Buffer.from(bio));row.bio=q.records.flatMap(r=>r.snapshots.map(s=>ft(s.timeHigh,s.timeLow)));}catch(e){row.bioErr=e.message;}}
  const rf=Object.keys(all).find(x=>/Config-0-ResolvedFeatures$/.test(x));row.hasRF=!!rf;
  if(rf){const {t,rows}=nodes(f);row.err=t.err&&t.err.message;row.modern=!t.legacy;row.nodes=rows.map(n=>{const b=Buffer.from(n.tail,'hex');return {cls:n.cls,id:n.id,name:n.name,order:n.order,cv:n.created.version,mv:n.modified.version,mx:n.modified.x,hi:b.readUInt32LE(46),lo:b.readUInt32LE(50),t:ft(b.readUInt32LE(46),b.readUInt32LE(50))};});}
 }catch(e){row.fail=e.message;}
 out.push(row);}
fs.writeFileSync('out/survey_all.json',JSON.stringify(out));
const c={files:out.length,withNodes:out.filter(r=>r.nodes&&r.nodes.length).length,err:out.filter(r=>r.err).length,fail:out.filter(r=>r.fail).length,noRF:out.filter(r=>!r.hasRF).length};
console.log(JSON.stringify(c));
