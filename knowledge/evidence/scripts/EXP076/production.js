#!/usr/bin/env node
'use strict';
/* EXP-076, part 2: which of the 24 original (production) parts get an exact STEP from the
 * native body, and what stops the rest. No SolidWorks STEP exists for these, so the check is
 * only that a body is written and reads back as itself; exact volume is reported for each.
 *
 *   node knowledge/evidence/scripts/EXP076/production.js [outdir] [--write]
 */
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..'),DIR=path.join(ROOT,'test files original');
const {readBody}=require('./lib/parasolid/partition'),{topology}=require('./lib/parasolid/topology');
const native=require('./lib/brep/native'),W=require('./lib/step/write'),step=require('./lib/step/read');
const {compare}=require('./lib/brep/compare'),{volume}=require('./lib/brep/volume');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const OUT=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:path.join(os.tmpdir(),'exp076','production');
fs.mkdirSync(OUT,{recursive:true});

const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);
const rows=[];
for(const f of walk(DIR).sort()){
  const name=path.relative(DIR,f),buf=fs.readFileSync(f),row={part:name,sha256:hash(buf)};
  try{
    const b=readBody(buf),g=topology(b.parsed);row.bodySource=b.source;
    if(g.errors.length)throw Error('B-rep failed '+g.errors.length+' graph checks');
    const N=native.build(b.parsed),out=W.write(N,{name});
    fs.writeFileSync(path.join(OUT,name.replace(/[\/\\]/g,'_').replace(/\.sldprt$/i,'.step')),out.text);
    const back=step.readBrep(out.text),cmp=compare(N,back);
    Object.assign(row,{result:'exact',report:out.report,roundTrip:cmp.pass,firstProblem:cmp.problems[0]||null,
      volumeMm3:{native:volume(N).volume*1e9,ours:volume(back).volume*1e9}});
  }catch(e){
    row.result=/Config-0-Partition stream; found 0/.test(e.message)?'no body':'blocked';
    row.reason=e.message;
  }
  rows.push(row);console.log(row.result.padEnd(8),name,row.reason||'');
}
const count=k=>rows.filter(r=>r.result===k).length;
const summary={parts:rows.length,exact:count('exact'),blocked:count('blocked'),noBody:count('no body'),
  roundTrip:rows.filter(r=>r.roundTrip).length,
  blockedBy:Object.fromEntries(rows.filter(r=>r.result==='blocked').map(r=>[r.part,r.reason]))};
console.log(JSON.stringify(summary,null,1));
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'PRODUCTION.json'),
  JSON.stringify({experiment:'EXP-076',date:new Date().toISOString(),summary,rows},null,1)+'\n');
