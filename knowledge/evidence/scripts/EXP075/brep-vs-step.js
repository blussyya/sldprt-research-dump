#!/usr/bin/env node
'use strict';
/* EXP-075 — the native Parasolid body against SolidWorks' own STEP export of the same part.
 *
 * For each of the 49 controlled models: decode the body from model.SLDPRT (Config-0-Partition),
 * read model.step (SolidWorks' export), and test correspondence modulo seam splitting at 1e-8 m
 * (Parasolid's BODY.res_linear). Then 20 controls: mutations of 1e-7 m or less and wrong-model
 * pairings, each of which must fail.
 *
 *   node knowledge/evidence/scripts/EXP075/brep-vs-step.js [--write]
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..');
const {readBody}=require('./lib/parasolid/partition'),native=require('./lib/brep/native'),step=require('./lib/step/read'),{compare}=require('./lib/brep/compare');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const dir=(era,m)=>path.join(ROOT,'test files new',era,m);
function load(era,m){const s=fs.readFileSync(path.join(dir(era,m),'model.SLDPRT')),t=fs.readFileSync(path.join(dir(era,m),'model.step'));
  return {N:native.build(readBody(s).parsed),T:step.readBrep(t.toString('utf8')),sha256:{sldprt:hash(s),step:hash(t)}};}

const rows=[];const worst={vertex:0,edge:0,surface:0,length:0};
for(const era of ['SW2011','SW2022'])for(const m of fs.readdirSync(path.join(ROOT,'test files new',era)).sort()){
  if(!fs.existsSync(path.join(dir(era,m),'model.step')))continue;
  const {N,T,sha256}=load(era,m),r=compare(N,T);
  for(const k in worst)worst[k]=Math.max(worst[k],r.deviation[k]);
  rows.push({model:`${era}/${m}`,sha256,pass:r.pass,problems:r.problems,stats:r.stats,deviation:r.deviation,surfaceParameters:r.surfaceParameters});
  console.log(`${(era+'/'+m).padEnd(38)} ${r.pass?'PASS':'FAIL'}  faces ${r.stats.faces.native}->${r.stats.faces.step}  edges ${r.stats.edges.native}->${r.stats.edges.step} (${r.stats.edges.seams} seams)  vertices ${r.stats.vertices.native}->${r.stats.vertices.step}`);
}
const first=(N,type)=>N.faces.find(f=>f.surface.type===type);
const firstEdge=(N,type)=>[...N.edges.values()].find(e=>(e.curve.type==='trimmed'?e.curve.basis.type:e.curve.type)===type);
const CONTROLS=[
  ['vertex moved 1e-7 m','C00_cube_10mm',N=>{const v=[...N.vertices.values()][0];v.p=[v.p[0]+1e-7,v.p[1],v.p[2]];}],
  ['plane offset 1e-7 m','C00_cube_10mm',N=>{const f=first(N,'plane');f.surface.p=f.surface.p.map((x,i)=>x+f.surface.n[i]*1e-7);}],
  ['plane tilted 1e-5 rad','C00_cube_10mm',N=>{const f=first(N,'plane'),n=f.surface.n,q=[n[1],n[2],n[0]];f.surface.n=n.map((x,i)=>x+q[i]*1e-5);}],
  ['face orientation flipped','C00_cube_10mm',N=>{N.faces[2].sameSense=!N.faces[2].sameSense;}],
  ['cylinder radius +1e-7 m','C04_cube_hole_5mm',N=>{first(N,'cylinder').surface.r+=1e-7;}],
  ['circle radius +1e-7 m','C04_cube_hole_5mm',N=>{firstEdge(N,'circle').curve.r+=1e-7;}],
  ['cone half-angle +1e-6 rad','C13_cone',N=>{first(N,'cone').surface.angle+=1e-6;}],
  ['sphere radius +1e-7 m','C14_sphere',N=>{first(N,'sphere').surface.r+=1e-7;}],
  ['torus minor radius +1e-7 m','C15_torus',N=>{first(N,'torus').surface.r+=1e-7;}],
  ['torus major radius +1e-7 m','C17_torus_quarter',N=>{first(N,'torus').surface.R+=1e-7;}],
  ['B-spline control point +1e-6 m','C16_loft_spline',N=>{const s=first(N,'bspline').surface;s.ctrl[4][1]=s.ctrl[4][1].map(x=>x+1e-6);}],
  ['B-spline knot moved','C16_loft_spline',N=>{const s=first(N,'bspline').surface;s.ku=s.ku.map((k,i)=>i===4?0.3:k);}],
  ['ellipse minor radius +1e-7 m','C20_cylinders_crossed',N=>{firstEdge(N,'ellipse').curve.r2+=1e-7;}],
  ['trimmed line shortened 1e-6','C16_loft_spline',N=>{firstEdge(N,'line').curve.t1-=1e-6;}],
  ['face removed','C07_cube_two_holes',N=>{N.faces.pop();}],
  ['edge removed','C10_cube_shell_1mm',N=>{N.edges.delete([...N.edges.keys()][3]);}],
  ['C04 body vs C11 STEP (4 mm hole)','C04_cube_hole_5mm',()=>{},'C11_cube_hole_4mm'],
  ['C04 body vs C06 STEP (hole moved)','C04_cube_hole_5mm',()=>{},'C06_cube_hole_moved'],
  ['C03 body vs C12 STEP (fillet on another edge)','C03_cube_fillet_1mm',()=>{},'C12_cube_fillet_1mm_edge2'],
  ['C00 body vs C18 STEP (split line)','C00_cube_10mm',()=>{},'C18_cube_split_line'],
];
const controls=CONTROLS.map(([name,m,mutate,other])=>{const {N}=load('SW2022',m),{T}=load('SW2022',other||m);mutate(N);const r=compare(N,T);return {name,model:m,against:other||m,caught:!r.pass,firstProblem:r.problems[0]||null};});
const summary={models:rows.length,pass:rows.filter(r=>r.pass).length,nativeFaces:rows.reduce((s,r)=>s+r.stats.faces.native,0),stepFaces:rows.reduce((s,r)=>s+r.stats.faces.step,0),
  nativeEdges:rows.reduce((s,r)=>s+r.stats.edges.native,0),stepEdges:rows.reduce((s,r)=>s+r.stats.edges.step,0),seams:rows.reduce((s,r)=>s+r.stats.edges.seams,0),
  worstDeviationMetres:worst,controlsCaught:`${controls.filter(c=>c.caught).length}/${controls.length}`};
console.log('\n'+JSON.stringify(summary,null,2));for(const c of controls)console.log(`${c.caught?'caught':'MISSED'}  ${c.name}: ${c.firstProblem}`);
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'RESULTS.json'),JSON.stringify({experiment:'EXP-075',date:'2026-10-03',tolerance:1e-8,summary,rows,controls},null,1)+'\n');
if(summary.pass!==summary.models||controls.some(c=>!c.caught))process.exitCode=1;
