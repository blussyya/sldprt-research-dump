'use strict';
// EXP-097 main check. For every display face with the two optional per-vertex arrays whose rawId
// is the node_id of a FACE in the file's primary body: evaluate the native surface at (A_i, B_i) and
// compare with display vertex i. Also runs controls. Writes run_eval.out.json.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const O=require('./own_eval.js');
const ROOT='/home/user/dump-validation';
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));

// float32 rounding floor: half an ulp of each stored float, pushed through the local derivative
const ulp32=x=>{if(x===0)return 1.4e-45;const e=Math.floor(Math.log2(Math.abs(x)));return Math.pow(2,e-23);};
function mulberry(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=mulberry(97);

function makeEval(node,nodeAt,mode){
  switch(node.name){
    case 'PLANE':return O.planeEval(node);
    case 'CYLINDER':return O.cylinderEval(node);
    case 'CONE':return O.coneEval(node);
    case 'SPHERE':return O.sphereEval(node);
    case 'B_SURFACE':return O.nurbsSurfaceEval(nodeAt(node.values.nurbs),nodeAt,mode&&mode.order?mode.order:'vfast');
    case 'SWEPT_SURF':return O.sweptEval(node,nodeAt,mode&&mode.sweep?mode.sweep:'unit');
  }
  return null;
}
// central-difference partials of S at (u,v), step scaled to the domain
function partials(E,u,v){const [[u0,u1],[v0,v1]]=E.domain;const hu=Math.min(1e-7*(isFinite(u1-u0)?(u1-u0):1),1e-7),hv=1e-7*(isFinite(v1-v0)?(v1-v0):1);
  const f=(a,b)=>E.S(a,b);
  const Su=O.V.mul(O.V.sub(f(u+hu,v),f(u-hu,v)),1/(2*hu)),Sv=O.V.mul(O.V.sub(f(u,v+hv),f(u,v-hv)),1/(2*hv));return {Su,Sv};}
function stats(xs){const s=xs.filter(Number.isFinite).sort((a,b)=>a-b),nonfinite=xs.length-s.length;if(!s.length)return {n:0,nonfinite,max:null,p50:null,p95:null};const q=p=>s[Math.min(s.length-1,Math.floor(p*s.length))];return {n:s.length,nonfinite,max:s[s.length-1],p50:q(0.5),p95:q(0.95)};}

const results=[],fileInfo=[];
for(const pf of scan.perFile){
  if(!pf.scalarFaces)continue;
  const file=path.join(ROOT,pf.file);const buf=fs.readFileSync(file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  let body={nodes:[],error:null};
  try{body=partition.readBody(buf,{}).parsed;}catch(e){body={nodes:[],error:'readBody: '+e.message};}
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>{const n=byIdx.get(i);if(!n)throw Error('missing node '+i);return n;};
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  const arrFaces=r.faces.filter(f=>f.metadata&&f.metadata.scalarArrays.length===2);
  const linked=arrFaces.filter(f=>faceNode.has(f.metadata.rawId));
  fileInfo.push({file:pf.file,arrayFaces:arrFaces.length,linked:linked.length,primaryError:body.error});
  for(const f of arrFaces){
    const rec={file:pf.file,rawId:f.metadata.rawId,tag:f.metadata.typeTag,nv:f.vertexCount};
    const fn=faceNode.get(f.metadata.rawId);
    if(!fn){rec.status='unlinked';results.push(rec);continue;}
    const TAG2NAME={4001:'PLANE',4002:'CYLINDER',4003:'CONE',4004:'SPHERE',4005:'TORUS',4006:'B_SURFACE',4007:'BLENDED_EDGE',4009:'SWEPT_SURF'};
    let surfNode,E;
    try{surfNode=nodeAt(fn.values.surface);rec.native=surfNode.name;rec.sense=fn.values.sense;E=makeEval(surfNode,nodeAt,{});}catch(e){rec.status='eval-error';rec.error=e.message;results.push(rec);continue;}
    if(!E){rec.status='unsupported';results.push(rec);continue;}
    if(TAG2NAME[f.metadata.typeTag]!==surfNode.name){rec.status='bad-link';rec.tagSays=TAG2NAME[f.metadata.typeTag];results.push(rec);continue;}
    // geometric join check for spheres: every display vertex must sit on the native sphere within 1e-4 m
    if(surfNode.name==='SPHERE'){const c=surfNode.values.centre,rad=surfNode.values.radius,Vx=f.vertices;let dev=0;
      for(let i=0;i<f.vertexCount;i++){const d=O.V.norm(O.V.sub([Vx[3*i],Vx[3*i+1],Vx[3*i+2]],c));dev=Math.max(dev,Math.abs(d-rad));}
      if(dev>1e-4){rec.status='bad-link';rec.reason='sphere vertices off native sphere by '+dev.toExponential(2)+' m';results.push(rec);continue;}}
    if(E.perp!==undefined)rec.frameOrthoResidual=E.perp;
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    const n=f.vertexCount;
    const err=[],swapErr=[],floorRatio=[],shuffleErr=[];
    let aMin=Infinity,aMax=-Infinity,bMin=Infinity,bMax=-Infinity;
    for(let i=0;i<n;i++){aMin=Math.min(aMin,A[i]);aMax=Math.max(aMax,A[i]);bMin=Math.min(bMin,B[i]);bMax=Math.max(bMax,B[i]);}
    const P=(i)=>[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];
    for(let i=0;i<n;i++){
      const X=P(i),u=A[i],v=B[i];
      const S=E.S(u,v);const e=O.V.norm(O.V.sub(S,X));err.push(e);
      const {Su,Sv}=partials(E,u,v);
      const floor=O.V.norm(Su)*ulp32(u)/2+O.V.norm(Sv)*ulp32(v)/2+[0,1,2].reduce((s,k)=>s+ulp32(X[k])/2,0);
      floorRatio.push(e/floor);
      swapErr.push(O.V.norm(O.V.sub(E.S(v,u),X)));
      const j=(i+Math.floor(n/2))%n;shuffleErr.push(O.V.norm(O.V.sub(E.S(A[j],B[j]),X)));
    }
    rec.status='ok';
    rec.err=stats(err);rec.swapErr=stats(swapErr);rec.shuffleErr=stats(shuffleErr);rec.floorRatio=stats(floorRatio);
    rec.aRange=[aMin,aMax];rec.bRange=[bMin,bMax];rec.domain=E.domain;
    // random uniform (u,v) in the observed ranges: null distribution
    const nullErr=[];for(let i=0;i<n;i++){const u=aMin+(aMax-aMin)*rnd(),v=bMin+(bMax-bMin)*rnd();nullErr.push(O.V.norm(O.V.sub(E.S(u,v),P(i))));}
    rec.nullErr=stats(nullErr);
    results.push(rec);
  }
}
fs.writeFileSync(path.join(__dirname,'run_eval.out.json'),JSON.stringify({fileInfo,results},null,1));
// quick console summary
const by={};for(const r of results){const k=(r.native||'-')+' '+r.status;by[k]=(by[k]||0)+1;}
console.log(JSON.stringify(by,null,1));
