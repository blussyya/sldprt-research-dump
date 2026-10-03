#!/usr/bin/env node
'use strict';
/* EXP-076 — exact STEP written from the native body, on all 49 controlled models.
 *
 * For each model: decode the body (Config-0-Partition), write STEP from it, then
 *   1. read our STEP back and compare it with the native body (EXP-075's comparison),
 *   2. integrate the exact enclosed volume of the native body, of our STEP, and of
 *      SolidWorks' model.step, from their surfaces and curves (lib/brep/volume.js),
 *   3. compare with closed-form volumes where the build spec gives one.
 * A "naive" pass writes the same bodies without the two fixes (vertex loops, splitting
 * boundary-less faces) to show what each fix is for.
 *
 *   node knowledge/evidence/scripts/EXP076/write-and-check.js [outdir] [--write]
 *
 * The STEP files go to outdir (default: a temp dir) for the OpenCascade checks in occ_check.py.
 */
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..');
const {readBody}=require('./lib/parasolid/partition'),native=require('./lib/brep/native'),step=require('./lib/step/read');
const W=require('./lib/step/write'),{compare}=require('./lib/brep/compare'),{volume}=require('./lib/brep/volume');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const OUT=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:path.join(os.tmpdir(),'exp076');
for(const d of ['full','naive'])fs.mkdirSync(path.join(OUT,d),{recursive:true});
const r=5,CLOSED={C00_cube_10mm:1000,C01_cube_20mm:8000,C10_cube_shell_1mm:424,C09_cube_chamfer_1mm:995,
  C04_cube_hole_5mm:1000-Math.PI*2.5*2.5*10,C05_cube_hole_3mm:1000-Math.PI*1.5*1.5*10,C13_cone:Math.PI*r*r*10/3,
  C14_sphere:4/3*Math.PI*r**3,C15_torus:2*Math.PI**2*5*2*2,C17_torus_quarter:2*Math.PI**2*5*2*2/4,
  C19_half_cylinder:Math.PI*r*r*10/2,C20_cylinders_crossed:2*Math.PI*r*r*20-16*r**3/3};

const rows=[],lists={full:[],naive:[]};
for(const era of ['SW2011','SW2022'])for(const m of fs.readdirSync(path.join(ROOT,'test files new',era)).sort()){
  const dir=path.join(ROOT,'test files new',era,m);if(!fs.existsSync(path.join(dir,'model.step')))continue;
  const sbytes=fs.readFileSync(path.join(dir,'model.SLDPRT')),swText=fs.readFileSync(path.join(dir,'model.step'),'utf8');
  const N=native.build(readBody(sbytes).parsed),row={model:`${era}/${m}`,sha256:{sldprt:hash(sbytes),step:hash(swText)}};
  for(const mode of ['naive','full']){
    let M=N;if(mode==='naive')M={...N,faces:N.faces.map(f=>({...f,loops:f.loops.filter(l=>l.coedges.length)})).filter(f=>f.loops.length)};
    const o=W.write(M,{name:m,timestamp:'2026-10-03T00:00:00Z'}),file=path.join(OUT,mode,`${era}_${m}.step`);
    fs.writeFileSync(file,o.text);lists[mode].push(file);
    const c=compare(N,step.readBrep(o.text));
    row[mode]={roundTrip:c.pass,firstProblem:c.problems[0]||null,report:o.report};
  }
  const vN=volume(N).volume*1e9,vMine=volume(step.readBrep(fs.readFileSync(path.join(OUT,'full',`${era}_${m}.step`),'utf8'))).volume*1e9,vSW=volume(step.readBrep(swText)).volume*1e9;
  row.volumeMm3={native:vN,ours:vMine,solidworksStep:vSW,closedForm:CLOSED[m]??null,oursMinusSolidworks:vMine-vSW,oursMinusClosedForm:CLOSED[m]===undefined?null:vMine-CLOSED[m]};
  rows.push(row);
  console.log(`${row.model.padEnd(38)} naive ${row.naive.roundTrip?'ok  ':'FAIL'} full ${row.full.roundTrip?'ok  ':'FAIL'}  V ${vMine.toFixed(9)}  -SW ${(vMine-vSW).toExponential(1)}${CLOSED[m]===undefined?'':'  -exact '+(vMine-CLOSED[m]).toExponential(1)}`);
}
for(const k in lists)fs.writeFileSync(path.join(OUT,k,'list.txt'),lists[k].join('\n')+'\n');
const summary={models:rows.length,naiveRoundTrip:rows.filter(r=>r.naive.roundTrip).length,fullRoundTrip:rows.filter(r=>r.full.roundTrip).length,
  naiveFailures:rows.filter(r=>!r.naive.roundTrip).map(r=>`${r.model}: ${r.naive.firstProblem}`),
  worstOursVsSolidworksRel:Math.max(...rows.map(r=>Math.abs(r.volumeMm3.oursMinusSolidworks)/r.volumeMm3.solidworksStep)),
  worstOursVsClosedFormRel:Math.max(...rows.filter(r=>r.volumeMm3.closedForm!==null).map(r=>Math.abs(r.volumeMm3.oursMinusClosedForm)/r.volumeMm3.closedForm)),
  closedFormModels:rows.filter(r=>r.volumeMm3.closedForm!==null).length,outdir:OUT};
console.log(JSON.stringify(summary,null,1));
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify({experiment:'EXP-076',date:'2026-10-03',summary:{...summary,outdir:undefined},rows},null,1)+'\n');
if(summary.fullRoundTrip!==summary.models)process.exitCode=1;
