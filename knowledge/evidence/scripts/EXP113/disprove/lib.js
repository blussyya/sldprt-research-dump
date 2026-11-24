// shared loader for the EXP113 disprove scripts
const R='/home/user/solidworks-converters/src/';
const S=require(R+'index.js'),G=require(R+'geom/eval.js'),DJ=require(R+'brep/display-join.js'),NAT=require(R+'brep/native.js');
const fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const PARTS={
'2e6e140a':'/home/user/sldprt-research-dump/test files online/2026/2e6e140a_ST3215_C018_04.SLDPRT',
 d0d61cde:ROOT+'test files online/2023/d0d61cde_官方元件-定位模块.SLDPRT',
 a4ecc6f5:ROOT+'test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT',
 '2f121983':ROOT+'test files online/2023/2f121983_case.SLDPRT',
 '03764871':ROOT+'test files online/2023/03764871_BME280.SLDPRT',
 Dekor:ROOT+'test files original/Dekor.SLDPRT',
 distributor:ROOT+'test files original/distributor main boss rev a.SLDPRT',
};
function load(file){
  const d=S.parse(file),N=NAT.build(S.readBrep(file).parsed);
  const j=DJ.join(d.faces,N);
  const edgeByDisp=new Map();for(const e of N.edges.values()){if(!edgeByDisp.has(e.displayId))edgeByDisp.set(e.displayId,[]);edgeByDisp.get(e.displayId).push(e);}
  return {d,N,j,edgeByDisp};
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>Math.hypot(a[0],a[1],a[2]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function vtx(f,i){return [f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];}
// distance from p to segment a-b
function segDist(p,a,b){const ab=sub(b,a),L=dot(ab,ab);let t=L?dot(sub(p,a),ab)/L:0;const tc=Math.max(0,Math.min(1,t));const q=[a[0]+ab[0]*tc,a[1]+ab[1]*tc,a[2]+ab[2]*tc];return {d:norm(sub(p,q)),t};}
function lineDist(p,a,b){const ab=sub(b,a),L=norm(ab);return norm(cross(sub(p,a),ab))/L;}
// distance to an edge curve (native edge); null if not computable
let RES=null; // resolved edges (src/brep/procedural.js) when RESOLVE=1; used for intersection curves (a fit, <=1e-8 m)
function setResolved(R){RES=R;}
function curveDist(e,p){
  let c=e.curve;if(c.type==='trimmed')c=c.basis;
  if(c.type==='intersection'){const r=RES&&RES.edges.get(e.id);if(!r)return null;c=r.curve;}
  try{
    if(c.type==='spcurve'){return G.curveProject(c,p).d;}
    return G.curveProject(c,p).d;}catch(x){return null;}
}
// distance to every fin curve of a tolerant edge (each fin has its own curve)
function finDists(e,p){const out=[];for(const pc of e.pcurves||[]){let c=pc.curve;if(c.type==='trimmed')c=c.basis;try{out.push(G.curveProject(c,p).d);}catch(x){}}return out;}
module.exports={setResolved,finDists,S,G,DJ,NAT,load,PARTS,ROOT,sub,dot,norm,cross,vtx,segDist,lineDist,curveDist,fs,path};
