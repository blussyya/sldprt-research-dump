'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),zlib=require('zlib');
const {parse}=require('../EXP071/typed-reader'),{topology,coverage}=require('../EXP071/audit'),{extract}=require('../EXP072/native-partitions');
const display=require('../../../../parser/v0.3/src/parser-core');
const ROOT=path.resolve(__dirname,'../../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),rows=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(/\.sldprt$/i.test(file)){
  const raw=fs.readFileSync(file),row={file:path.relative(ROOT,file),sha256:hash(raw)};try{const x=extract(raw),r=parse(x.inner,true);assert.equal(r.error,null);const graph=topology(r);assert.deepEqual(graph.errors,[]);Object.assign(row,{status:'complete',innerSHA256:hash(x.inner),schema:r.header.schema,nodes:r.nodes.length,counts:r.nodes.reduce((a,n)=>(a[n.name]=(a[n.name]||0)+1,a),{}),coverage:coverage(r),topologyChecks:graph.checks,unresolved:r.unresolved,newSchemas:r.edits.filter(e=>e.ops==='NEW')});const mesh=display.parseSLDPRT(raw,b=>zlib.inflateRawSync(b),b=>zlib.inflateSync(b));row.display={faces:mesh.faces.length,errors:mesh.errors};row.nativeFaces=r.nodes.filter(n=>n.type===14).length;
  }catch(e){Object.assign(row,{status:'blocked',reason:e.message});}rows.push(row);
}}}
walk(path.join(ROOT,'test files original'));
const complete=rows.filter(r=>r.status==='complete');assert.equal(rows.length,24);assert.equal(complete.length,21);
const result={experiment:'EXP-073',capturedUTC:'2026-09-29',scope:'Original corpus primary Config-0-Partition only',summary:{files:rows.length,complete:complete.length,blocked:rows.length-complete.length,nodes:complete.reduce((s,r)=>s+r.nodes,0),nativeFaces:complete.reduce((s,r)=>s+r.nativeFaces,0),topologyChecks:complete.reduce((s,r)=>s+r.topologyChecks,0),faceCountMismatches:complete.filter(r=>r.nativeFaces!==r.display.faces).map(r=>({file:r.file,native:r.nativeFaces,display:r.display.faces}))},rows};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));
