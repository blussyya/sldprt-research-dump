#!/usr/bin/env node
'use strict';
/* EXP-098 control: on parts with one Config-N-Partition the right geometry is known, so the box
 * test should match. Its miss rate here is its false-negative rate. Each miss is classed by the
 * face count, the gap, and whether the B-rep box is inside the display box (display padded or a
 * missed extreme) or outside it. Each part runs in its own process, capped at 180 s, and its row
 * is appended to box-control.jsonl as it finishes; a rerun skips parts already there. The summary
 * goes to box-control.json. */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {corpusFiles,relative,ROOT}=require('../EXP091/common');
const CONV=process.env.SLDPRT_CONVERTER||path.resolve(ROOT,'../solidworks-converters');
const P=require(CONV+'/src/parasolid/partition'),S=require(CONV+'/src/parasolid/select'),D=require(CONV+'/src/display'),N=require(CONV+'/src/brep/native');
const iR=b=>zlib.inflateRawSync(b,{maxOutputLength:1<<27}),iZ=b=>zlib.inflateSync(b,{maxOutputLength:1<<27});
function measure(file){
  const raw=new Uint8Array(fs.readFileSync(file));let all;try{all=P.streams(raw);}catch(_){return null;}
  const parts=Object.keys(all).filter(k=>/(?:^|\/)Config-\d+-Partition$/.test(k));if(parts.length!==1)return null;
  const row={file:relative(file)};
  try{
    const d=D.parseSLDPRT(raw,iR,iZ),want=S.displayBox(d);row.displayFaces=d.faces.length;
    if(!want){row.result='no display bounds';return row;}
    const {parsed}=P.readBody(raw);const b=S.brepBox(parsed);row.brepFaces=b.faces;
    const n=N.build(parsed);row.tolerantVertices=[...n.vertices.values()].filter(v=>v.tolerance).length;
    row.tolerantEdges=[...n.edges.values()].filter(e=>e.tolerance).length;
    const sides=[0,1,2].flatMap(k=>[want.min[k]-b.box.min[k],b.box.max[k]-want.max[k]]);// >0: B-rep outside display
    row.gap=Math.max(...sides.map(Math.abs));row.outside=Math.max(...sides);row.inside=-Math.min(...sides);
    row.result=b.faces!==d.faces.length?'face count differs':row.gap<=S.BAR?'match':'box gap';
  }catch(e){row.result='error';row.error=e.message;}
  return row;
}

if(process.argv[2]==='--one'){const r=measure(process.argv[3]);process.stdout.write(JSON.stringify(r));process.exit(0);}
const {spawnSync}=require('child_process'),JL=path.join(__dirname,'box-control.jsonl');
const done=new Set(fs.existsSync(JL)?fs.readFileSync(JL,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).file):[]);
for(const file of corpusFiles()){
  if(done.has(relative(file)))continue;
  const t=Date.now(),c=spawnSync(process.execPath,[__filename,'--one',file],{encoding:'utf8',timeout:180000,maxBuffer:1<<26});
  let row;
  if(c.error||c.status!==0)row={file:relative(file),result:c.error&&c.error.code==='ETIMEDOUT'?'timeout':'error',error:(c.error&&c.error.message)||c.stderr.slice(-300)};
  else row=JSON.parse(c.stdout||'null');
  if(!row)row={file:relative(file),result:'skip'};
  row.seconds=(Date.now()-t)/1000;fs.appendFileSync(JL,JSON.stringify(row)+'\n');
  if(row.result!=='skip')console.error(row.result,row.seconds,row.file);
}
const rows=fs.readFileSync(JL,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.result!=='skip');
const count=k=>rows.filter(r=>r.result===k).length,gapRows=rows.filter(r=>r.result==='box gap');
const summary={files:rows.length,match:count('match'),boxGap:count('box gap'),faceCountDiffers:count('face count differs'),
  noDisplayBounds:count('no display bounds'),error:count('error'),timeout:count('timeout'),
  boxGapWithTolerance:gapRows.filter(r=>r.tolerantVertices||r.tolerantEdges).length,
  boxGapBrepOnlyInside:gapRows.filter(r=>r.outside<=S.BAR).length,
  boxGapUnder1um:gapRows.filter(r=>r.gap<1e-6).length,largestGap:Math.max(0,...gapRows.map(r=>r.gap))};
fs.writeFileSync(path.join(__dirname,'box-control.json'),JSON.stringify({summary,rows},null,1)+'\n');
console.log(JSON.stringify(summary,null,1));
