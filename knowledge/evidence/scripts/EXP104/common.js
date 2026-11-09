'use strict';
/* Shared by the EXP-104 scripts. SRC picks the converter tree: the dev tree for "before", the
 * feature/display-ids worktree for "after". Corpus: the three test-file folders, as in EXP-091. */
const fs=require('fs'),path=require('path');
const SRC=process.env.SRC||'/home/user/conv-ids/src';
const ROOT='/home/user/sldprt-research-dump/';
const S=require(SRC+'/index'),N=require(SRC+'/brep/native');
const TAGTYPE={4001:'plane',4002:'cylinder',4003:'cone',4004:'sphere',4005:'torus',4006:'bspline',4007:'blend',4009:'swept',4010:'spun'};

function corpusFiles(){
  const out=[];
  for(const base of ['test files original','test files new','test files online']){
    const root=path.join(ROOT,base);if(!fs.existsSync(root))continue;
    (function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))out.push(p);}})(root);
  }
  return [...new Set(out.map(p=>path.resolve(p)))].sort();
}
const rel=p=>path.relative(ROOT,p);

/* Load one part: display faces with an id block, and the native model. null if either is missing. */
function load(file){
  let d,B,M;
  try{d=S.parse(file);}catch(e){return {error:'display: '+e.message};}
  if(/legacy/.test(d.format))return {legacy:true,displayFaces:d.faces.length};
  try{B=S.readBrep(file);M=N.build(B.parsed);}catch(e){return {error:'brep: '+e.message,displayFaces:d.faces.length};}
  return {d,M,B,display:d.faces.filter(f=>f.metadata)};
}

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>Math.hypot(a[0],a[1],a[2]);
/* Residual of point p to an analytic surface, metres. Closed forms written out here, not G.surfaceDistance. */
function residual(s,p){
  switch(s.type){
    case 'plane':return dot(sub(p,s.p),s.n);
    case 'cylinder':{const q=sub(p,s.p),h=dot(q,s.a);return nrm([q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h])-s.r;}
    case 'cone':{const q=sub(p,s.p),h=dot(q,s.a),rho=nrm([q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h]);return (rho-(s.r+h*Math.tan(s.angle)))*Math.cos(s.angle);}
    case 'sphere':return nrm(sub(p,s.c))-s.r;
    case 'torus':{const q=sub(p,s.c),h=dot(q,s.a),rad=[q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h],rho=nrm(rad);
      if(rho===0)return NaN;const k=s.R/rho;return nrm([q[0]-rad[0]*k,q[1]-rad[1]*k,q[2]-rad[2]*k])-s.r;}
  }
  return null;
}
/* Max |residual| of all of a display face's vertices on a native face's surface; null if the surface has no closed form here. */
function maxResidual(df,nf){
  const s=nf.surface;let max=0;
  if(residual(s,[0,0,0])===null)return null;
  for(let i=0;i<df.vertexCount;i++){const r=Math.abs(residual(s,[df.vertices[3*i],df.vertices[3*i+1],df.vertices[3*i+2]]));if(!(r<=max))max=r;if(Number.isNaN(r))return NaN;}
  return max;
}
/* Share of the display face's vertices within bar of the surface; null if no closed form. */
function onSurfaceShare(df,nf,bar){
  const s=nf.surface;if(residual(s,[0,0,0])===null||!df.vertexCount)return null;
  let n=0;for(let i=0;i<df.vertexCount;i++)if(Math.abs(residual(s,[df.vertices[3*i],df.vertices[3*i+1],df.vertices[3*i+2]]))<=bar)n++;
  return n/df.vertexCount;
}
/* Edge ids of the display face (from its id block) against the section ids of the native face's edges.
 * 'same' / 'differ' / null (display face lists no edges). */
function edgeIds(M,df,nf){
  const want=new Set(df.metadata.edgeRecords.map(e=>e.id));if(!want.size)return null;
  const got=new Set();for(const l of nf.loops||[])for(const c of l.coedges||[]){const e=M.edges.get(c.edge);if(e)got.add(e.displayId!==undefined?e.displayId:e.id);}
  return want.size===got.size&&[...want].every(x=>got.has(x))?'same':'differ';
}
/* Native vertices of a face, through its loops. Ring edges contribute none. */
function faceVertices(M,nf){
  const out=new Set();
  for(const l of nf.loops||[])for(const c of l.coedges||[]){const e=M.edges.get(c.edge);if(e&&e.v)for(const v of e.v)if(v!==null)out.add(v);}
  return [...out].map(v=>M.vertices.get(v)).filter(Boolean).map(v=>v.p);
}
/* Do the native face's vertices lie inside the display face's stored bounds (+tol)? null: the face has no vertices. */
function inBounds(M,df,nf,tol=1e-5){
  if(!df.bounds)return null;
  const vs=faceVertices(M,nf);if(!vs.length)return null;
  return vs.every(p=>p.every((x,k)=>x>=df.bounds.min[k]-tol&&x<=df.bounds.max[k]+tol));
}
module.exports={onSurfaceShare,edgeIds,SRC,ROOT,S,N,TAGTYPE,corpusFiles,rel,load,residual,maxResidual,faceVertices,inBounds};
