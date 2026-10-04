#!/usr/bin/env node
'use strict';
/* EXP-079 part A — how SolidWorks' own STEP export writes the geometry STEP can't express exactly,
 * measured on the two real parts that ship a SolidWorks STEP (USB hub TOP and BOTTOM), and the same
 * parts written by the package in that form.
 *
 *   node knowledge/evidence/scripts/EXP079/sw-step-forms.js [--write]
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../../../..'),PKG=path.join(ROOT,'package/src');
const S=require(PKG),G=require(PKG+'/geom/eval'),{compare}=require(PKG+'/brep/compare');
const D=path.join(ROOT,'test files original/usb hub case (ultimate test)');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const out={experiment:'EXP-079 part A',date:new Date().toISOString(),parts:{}};

for(const part of ['TOP','BOTTOM']){
  const sp=path.join(D,`USB hub case ${part}.SLDPRT`),tp=path.join(D,`USB hub case ${part} ORIGINAL.STEP`);
  const text=fs.readFileSync(tp,'utf8'),N=S.brep.model(S.readBrep(sp).parsed),T=S.step.read(text);
  const row={sha256:{sldprt:hash(fs.readFileSync(sp)),step:hash(text)}};
  // same model? every native vertex is a SolidWorks vertex
  const tv=[...T.vertices.values()].map(v=>v.p),nv=[...N.vertices.values()].map(v=>v.p);
  row.vertices={native:nv.length,step:tv.length,nativeMatched:nv.filter(p=>tv.some(q=>G.dist(p,q)<1e-9)).length,
    worst:Math.max(...nv.map(p=>Math.min(...tv.map(q=>G.dist(p,q)))))};
  row.uncertainty=(text.match(/LENGTH_MEASURE\(\s*([0-9.E+-]+)\s*\)/)||[])[1];
  // SolidWorks' B-spline edge curves against the package's curves for the same edges (within 1e-9 m of exact)
  const nb=[...N.edges.values()].filter(e=>e.curve.type==='bspline');const curves=[];
  for(const e of T.edges.values()){if(e.curve.type!=='bspline')continue;
    const [a,b]=G.curveRange(e.curve),pts=Array.from({length:41},(_,k)=>G.curvePoint(e.curve,a+(b-a)*k/40));
    let best=null,bd=Infinity;for(const ne of nb){const d=G.curveProject(ne.curve,pts[20]).d;if(d<bd){bd=d;best=ne;}}
    if(!best||bd>1e-5)continue;
    curves.push({ctrl:e.curve.ctrl.length,degree:e.curve.degree,mult:e.curve.mult||null,deviation:Math.max(...pts.map(q=>G.curveProject(best.curve,q).d)),oursCtrl:best.curve.ctrl.length});}
  row.swCurves={count:curves.length,worstDeviation:Math.max(...curves.map(c=>c.deviation)),ctrl:curves.map(c=>c.ctrl),oursCtrl:curves.map(c=>c.oursCtrl)};
  row.swSurfaces=T.faces.filter(f=>f.surface.type==='bspline').map(f=>({deg:[f.surface.du,f.surface.dv],ctrl:[f.surface.ctrl.length,f.surface.ctrl[0].length],rational:!!f.surface.weights}));
  row.oursBlends=N.faces.filter(f=>f.surface.source&&f.surface.source.type==='BLENDED_EDGE').map(f=>({form:f.surface.source.form,deviation:f.surface.source.deviation,ctrl:[f.surface.ctrl.length,f.surface.ctrl[0].length]}));
  row.volumeMm3={native:S.brep.volume(N).volume*1e9,solidworksStep:S.brep.volume(T).volume*1e9};
  const ours=S.step.write(N,{name:part});row.ours={bytes:ours.text.length,roundTrip:compare(N,S.step.read(ours.text)).pass};
  row.swBytes=text.length;
  out.parts[part]=row;console.log(part,JSON.stringify(row,(k,v)=>Array.isArray(v)&&v.length>12?v.slice(0,12).concat(['…']):v,1));
}
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'SW_STEP_FORMS.json'),JSON.stringify(out,null,1)+'\n');
