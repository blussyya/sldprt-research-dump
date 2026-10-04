#!/usr/bin/env node
'use strict';
/* EXP-078 — exact STEP for every real part.
 *
 * For each part in `test files original/` (the controlled copies excluded) that has a solid:
 *   1. build the neutral model from the native body, with INTERSECTION curves marched to 1e-9 m,
 *      tolerant edges built from their fin curves, swept surfaces as linear extrusions and
 *      rolling-ball blends fitted as B-splines;
 *   2. write STEP and read it back against the model (EXP-075's comparison);
 *   3. integrate the exact volume;
 *   4. check every display-mesh vertex against its own face's surface; an off-surface boundary
 *      vertex that lies on the straight segment between two on-surface boundary vertices of the
 *      same face is a chord point (EXP-074), anything else is counted as unexplained.
 * The STEP files go to outdir for occ_check.py.
 *
 *   node knowledge/evidence/scripts/EXP078/exact-all.js <outdir> [--write]
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../../../..'),ORIG=path.join(ROOT,'test files original'),L=path.join(__dirname,'lib');
const {readBody}=require(L+'/parasolid/partition'),{topology}=require(L+'/parasolid/topology'),display=require(L+'/display');
const native=require(L+'/brep/native'),W=require(L+'/step/write'),stepRead=require(L+'/step/read'),{compare}=require(L+'/brep/compare'),{volume}=require(L+'/brep/volume');
const G=require(L+'/geom/eval');
const OUT=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:path.join(require('os').tmpdir(),'exp078');
fs.mkdirSync(OUT,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='controlled'?[]:walk(path.join(d,e.name))):/\.sldprt$/i.test(e.name)?[path.join(d,e.name)]:[]);

/* Files whose mesh has no face IDs (SolidWorks 2011 and older) are joined to the B-rep by edge
 * set or geometry (lib/link.js) and given the IDs, so the same check runs on them. */
function withIds(N,d){
  if(d.faces.every(f=>f.metadata))return d;
  const {join}=require(L+'/link'),j=join(d,N),faces=d.faces.map(f=>({...f}));
  for(const x of j.faces)faces[x.index].metadata={rawId:x.id,joinedBy:x.method};
  return {...d,faces};
}
function meshCheck(N,d){
  d=withIds(N,d);
  // A display vertex off its face's surface is a chord point when it lies on the straight segment
  // between its two neighbours along the B-rep edge it is annotated with, the neighbours being
  // display vertices (from either face) on that edge's curve. Coordinates are float32, so "on"
  // means within float32 resolution: 1.5e-7 of the coordinate size, at least 3e-8 m.
  const {edgePath}=require(L+'/brep/volume');
  const byId=new Map(d.faces.filter(f=>f.metadata).map(f=>[f.metadata.rawId,f]));
  const perEdge=new Map();
  for(const m of d.faces)for(const a of m.edgeAnnotations)if(a.id)for(const i of a.vertices)(perEdge.get(a.id)||perEdge.set(a.id,[]).get(a.id)).push([0,1,2].map(k=>m.vertices[3*i+k]));
  const cache=new Map(),onEdge=eid=>{if(!cache.has(eid)){const e=N.edges.get(eid),p=edgePath(e,N.vertices),c=p.c,period=G.periodic(c)?G.TAU:(!e.v||e.v[0]===e.v[1])?(p.t1-p.t0):0;
    cache.set(eid,{c,period,on:(perEdge.get(eid)||[]).map(q=>({q,t:G.curveProject(c,q).t,d:G.curveProject(c,q).d})).filter(x=>x.d<=ftol(x.q))});}return cache.get(eid);};
  function ftol(q){return Math.max(3e-8,1.5e-7*G.norm(q));}
  const res={vertices:0,onSurface:0,chord:0,unexplainedBoundary:0,unexplainedInterior:0,worstUnexplainedM:0,byType:{}};
  for(const F of N.faces){
    const m=byId.get(F.id);if(!m)continue;const t=F.surface.source?F.surface.source.type:F.surface.type;
    const T=res.byType[t]||(res.byType[t]={vertices:0,onSurface:0,chord:0,unexplained:0,worstOnSurfaceM:0});
    const edgeOf=new Map();for(const a of m.edgeAnnotations)if(a.id)for(const i of a.vertices)edgeOf.set(i,a.id);
    for(let i=0;i<m.vertexCount;i++){
      const q=[0,1,2].map(k=>m.vertices[3*i+k]),dist=Math.abs(G.surfaceDistance(F.surface,q).d);res.vertices++;T.vertices++;
      if(dist<=1e-6){res.onSurface++;T.onSurface++;T.worstOnSurfaceM=Math.max(T.worstOnSurfaceM,dist);continue;}
      const eid=edgeOf.get(i);let chord=false;
      if(eid&&N.edges.has(eid)){const E=onEdge(eid),tq=G.curveProject(E.c,q).t;let lo=null,hi=null;
        for(const x of E.on){for(const sh of E.period?[-E.period,0,E.period]:[0]){const tt=x.t+sh;if(tt<tq&&(!lo||tt>lo.t))lo={q:x.q,t:tt};if(tt>tq&&(!hi||tt<hi.t))hi={q:x.q,t:tt};}}
        if(lo&&hi){const AB=G.sub(hi.q,lo.q),s2=G.dot(G.sub(q,lo.q),AB)/G.dot(AB,AB);chord=s2>0&&s2<1&&G.dist(q,G.add(lo.q,G.mul(AB,s2)))<=ftol(q);}}
      if(chord){res.chord++;T.chord++;}
      else{T.unexplained++;if(eid)res.unexplainedBoundary++;else res.unexplainedInterior++;res.worstUnexplainedM=Math.max(res.worstUnexplainedM,dist);}
    }
  }
  return res;
}

const rows=[];
const ONLY=(process.argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
for(const f of walk(ORIG).sort()){
  if(ONLY.length&&!ONLY.some(o=>f.includes(o)))continue;
  const name=path.relative(ORIG,f),raw=fs.readFileSync(f),row={part:name,sha256:hash(raw)};
  let b;try{b=readBody(raw);}catch(e){row.result='no solid';row.reason=e.message;rows.push(row);console.log('no solid',name);continue;}
  const g=topology(b.parsed);row.graphErrors=g.errors.length;
  let t=Date.now();const N=native.build(b.parsed);row.modelMs=Date.now()-t;
  const fits={INTERSECTION:[],SP_CURVE:[],BLENDED_EDGE:[]};
  for(const e of N.edges.values())if(e.curve.source)fits[e.curve.source.type].push(e.curve.source.deviation);
  for(const F of N.faces)if(F.surface.source)fits[F.surface.source.type].push(F.surface.source.deviation);
  row.fits=Object.fromEntries(Object.entries(fits).filter(([,v])=>v.length).map(([k,v])=>[k,{count:v.length,worstDeviationM:Math.max(...v)}]));
  row.surfaces={};for(const F of N.faces){const k=F.surface.source?F.surface.source.type:F.surface.type;row.surfaces[k]=(row.surfaces[k]||0)+1;}
  t=Date.now();const out=W.write(N,{name});row.writeMs=Date.now()-t;
  fs.writeFileSync(path.join(OUT,name.replace(/[\/\\]/g,'_').replace(/\.sldprt$/i,'.step')),out.text);
  const cmp=compare(N,stepRead.readBrep(out.text));row.roundTrip=cmp.pass;row.firstProblem=cmp.problems[0]||null;
  t=Date.now();row.volumeMm3=volume(N).volume*1e9;row.volumeMs=Date.now()-t;
  const d=display.parseSLDPRT(raw,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));
  let V=0;for(const fc of d.faces){const v=fc.vertices,tt=fc.triangleIndices;for(let i=0;i<tt.length;i+=3){const a=[0,1,2].map(k=>v[3*tt[i]+k]),bb=[0,1,2].map(k=>v[3*tt[i+1]+k]),c=[0,1,2].map(k=>v[3*tt[i+2]+k]);V+=G.dot(a,G.cross(bb,c))/6;}}
  row.meshVolumeMm3=V*1e9;
  row.mesh=meshCheck(N,d);
  row.result='exact';rows.push(row);
  console.log(name.padEnd(56),'roundtrip',row.roundTrip,'volume',row.volumeMm3.toFixed(6),'mesh',row.meshVolumeMm3.toFixed(3),'unexplained',row.mesh.unexplainedBoundary,row.mesh.unexplainedInterior,JSON.stringify(row.fits));
}
const ex=rows.filter(r=>r.result==='exact');
const summary={parts:rows.length,exact:ex.length,noSolid:rows.filter(r=>r.result==='no solid').map(r=>r.part),roundTrip:ex.filter(r=>r.roundTrip).length,
  meshVertices:ex.reduce((s,r)=>s+(r.mesh.vertices||0),0),onSurface:ex.reduce((s,r)=>s+(r.mesh.onSurface||0),0),
  chordPoints:ex.reduce((s,r)=>s+(r.mesh.chord||0),0),unexplainedBoundary:ex.reduce((s,r)=>s+(r.mesh.unexplainedBoundary||0),0),unexplainedInterior:ex.reduce((s,r)=>s+(r.mesh.unexplainedInterior||0),0)};
console.log(JSON.stringify(summary,null,1));
// a partial run (--only=...) writes RESULTS_PARTIAL.json and leaves RESULTS.json alone
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,ONLY.length?'RESULTS_PARTIAL.json':'RESULTS.json'),JSON.stringify({experiment:'EXP-078',date:new Date().toISOString(),summary,rows},null,1)+'\n');
