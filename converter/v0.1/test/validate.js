'use strict';
/**
 * converter/v0.1 validation.
 *
 * Two external checks, neither of which reuses the converter's own arithmetic:
 *
 *  STL   The emitted mesh is compared triangle-for-triangle against the .STL SolidWorks
 *        itself exported for the same part. Triangles are matched as unordered vertex sets
 *        so winding and strip order cannot mask a mismatch.
 *
 *  STEP  The emitted file is re-parsed with step-tools/step-parse.js (written for the
 *        original SolidWorks STEP exports, not for this writer) and its entity graph is
 *        checked for danglings, then its geometry is compared against the original .step.
 *
 * NOTE ON UNITS AND PRECISION: DisplayList coordinates are float32 metres; the exports are
 * millimetres. A 10 mm cube therefore round-trips as 9.9999998 mm. Tolerances below are set
 * from float32 resolution, not chosen to make the test pass.
 */
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const parser=require(path.join(__dirname,'..','..','..','parser','v0.2','src','parser-core'));
const C=require('../src/convert-core');
const {parseSTEP,getType}=require(path.join(__dirname,'..','..','..','step-tools','step-parse'));

const ROOT=path.join(__dirname,'..','..','..');
// float32 has ~7 significant decimal digits; at 10 mm that is ~1e-6 mm.
const TOL=2e-5;

function readBinarySTL(buf){
 // SolidWorks writes binary STL whose first bytes still spell "solid".
 const n=buf.readUInt32LE(80);
 if(buf.length!==84+50*n)return null;
 const tris=[];
 for(let i=0;i<n;i++){
  const o=84+i*50+12,v=[];
  for(let k=0;k<3;k++)v.push([buf.readFloatLE(o+k*12),buf.readFloatLE(o+k*12+4),buf.readFloatLE(o+k*12+8)]);
  tris.push(v);
 }
 return tris;
}
const q=(p,t)=>p.map(x=>Math.round(x/t)).join(',');
/** Canonical key for a triangle: vertex set, order-independent. */
const triKey=(t,tol)=>t.map(p=>q(p,tol)).sort().join('|');

function multiset(keys){const m=new Map();for(const k of keys)m.set(k,(m.get(k)||0)+1);return m;}
/** Signed volume via the divergence theorem. Meaningless unless the mesh is closed. */
function meshVolume(tris){
 let v=0;
 for(const [a,b,c] of tris)
  v+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 return Math.abs(v);
}
function meshBBox(tris){
 const lo=[1e30,1e30,1e30],hi=[-1e30,-1e30,-1e30];
 for(const t of tris)for(const p of t)for(let k=0;k<3;k++){
  if(p[k]<lo[k])lo[k]=p[k];if(p[k]>hi[k])hi[k]=p[k];}
 return {lo,hi,size:[0,1,2].map(k=>hi[k]-lo[k])};
}
/** Odd-used undirected edges mean the mesh has a hole. */
function meshOpenEdges(tris,tol){
 const use=new Map();
 for(const t of tris)for(let i=0;i<3;i++){
  const a=q(t[i],tol),b=q(t[(i+1)%3],tol);
  const k=a<b?a+'|'+b:b+'|'+a;
  use.set(k,(use.get(k)||0)+1);
 }
 let open=0;for(const v of use.values())if(v%2!==0)open++;
 return open;
}
function diffCount(a,b){
 let d=0;const keys=new Set([...a.keys(),...b.keys()]);
 for(const k of keys)d+=Math.abs((a.get(k)||0)-(b.get(k)||0));
 return d;
}

function checkStepGraph(text){
 const ents=parseSTEP(text);
 const ids=new Set(Object.keys(ents).map(Number));
 let dangling=0,refs=0;
 const counts={};
 for(const [id,body] of Object.entries(ents)){
  const ty=getType(body)||'(complex)';
  counts[ty]=(counts[ty]||0)+1;
  for(const m of body.matchAll(/#(\d+)/g)){refs++;if(!ids.has(+m[1]))dangling++;}
 }
 return {entities:ids.size,refs,dangling,counts};
}

/** Every CARTESIAN_POINT in a STEP file, as canonical keys. */
function stepPoints(text,tol){
 const ents=parseSTEP(text);
 const pts=[];
 for(const body of Object.values(ents)){
  const m=body.match(/^CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(([^)]*)\)/);
  if(!m)continue;
  const n=m[1].split(',').map(s=>parseFloat(s.trim()));
  if(n.length===3&&n.every(isFinite))pts.push(q(n,tol));
 }
 return new Set(pts);
}

function run(){
 const dir=path.join(ROOT,'test files original','controlled');
 const models=fs.readdirSync(dir).filter(d=>/^C\d\d/.test(d)).sort();
 const rows=[];
 for(const m of models){
  const base=path.join(dir,m);
  const sldprt=path.join(base,'model.SLDPRT');
  if(!fs.existsSync(sldprt))continue;
  const row={model:m};
  let parsed;
  try{parsed=parser.parseSLDPRT(fs.readFileSync(sldprt),zlib.inflateRawSync,zlib.inflateSync);}
  catch(e){row.error=e.message;rows.push(row);continue;}
  if(!parsed.faces||!parsed.faces.length){row.error=(parsed.errors||['no faces']).join('; ');rows.push(row);continue;}
  const model=C.loadModel(parsed);
  row.faces=model.faceCount;row.triangles=model.triangleCount;

  // ---- STL against SolidWorks' own export
  const stlFile=fs.readdirSync(base).find(f=>/\.stl$/i.test(f));
  if(stlFile){
   const orig=readBinarySTL(fs.readFileSync(path.join(base,stlFile)));
   const mine=readBinarySTL(C.toSTLBinary(model,{}));
   if(!orig){row.stl='original not binary STL';}
   else{
    row.stlOrigTris=orig.length;row.stlMineTris=mine.length;
    const mo=multiset(orig.map(t=>triKey(t,TOL))),mm=multiset(mine.map(t=>triKey(t,TOL)));
    row.stlTriDiff=diffCount(mo,mm);
    // Is the original a strict subset of ours? (EXP-049: some exports drop a whole face.)
    let origMissing=0,mineMissing=0;
    for(const [k,n] of mm)origMissing+=Math.max(0,n-(mo.get(k)||0));
    for(const [k,n] of mo)mineMissing+=Math.max(0,n-(mm.get(k)||0));
    row.onlyInMine=origMissing;row.onlyInOrig=mineMissing;
    const bo=meshBBox(orig),bm=meshBBox(mine);
    row.bboxMaxDelta=+Math.max(...[0,1,2].map(k=>
      Math.max(Math.abs(bo.lo[k]-bm.lo[k]),Math.abs(bo.hi[k]-bm.hi[k])))).toExponential(3);
    row.openOrig=meshOpenEdges(orig,TOL);row.openMine=meshOpenEdges(mine,TOL);
    const vo=meshVolume(orig),vm=meshVolume(mine);
    row.volOrig=+vo.toFixed(6);row.volMine=+vm.toFixed(6);
    row.volRelDelta=vo?+(Math.abs(vo-vm)/vo).toExponential(3):null;
    if(row.stlTriDiff===0&&orig.length===mine.length)row.stl='EXACT';
    else if(mineMissing===0)row.stl='SUPERSET (original incomplete)';
    else row.stl='RETESSELLATED';
   }
  }

  // ---- STEP: emit, re-parse, compare points against the original STEP export
  try{
   const {text,report}=C.toSTEP(model,{name:m});
   const g=checkStepGraph(text);
   row.stepEntities=g.entities;row.stepDangling=g.dangling;
   row.stepAnalytic=report.analyticPlanes;row.stepFaceted=report.facetedFaces;
   row.stepBody=report.body;
   const origStep=fs.readdirSync(base).find(f=>/\.step$/i.test(f));
   if(origStep){
    const mineP=stepPoints(text,TOL);
    const origP=stepPoints(fs.readFileSync(path.join(base,origStep),'utf8'),TOL);
    let covered=0;for(const k of mineP)if(origP.has(k))covered++;
    row.stepPtsMine=mineP.size;row.stepPtsOrig=origP.size;
    row.stepPtsShared=covered;
   }
   row.step=g.dangling===0?'OK':'DANGLING';
  }catch(e){row.step='ERROR: '+e.message;}
  rows.push(row);
 }
 return rows;
}

if(require.main===module){
 const rows=run();
 for(const r of rows)console.log(JSON.stringify(r));
 const bad=rows.filter(r=>r.error||r.step!=='OK'||r.stepDangling>0);
 console.log('\n'+rows.length+' models, '+bad.length+' with problems');
 process.exit(bad.length?1:0);
}
module.exports={run,readBinarySTL,triKey};
