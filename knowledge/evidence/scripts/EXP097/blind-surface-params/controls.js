'use strict';
// Controls for EXP-097. (1) Perturbed surfaces on the controlled cone and sphere: each change should
// be visible, so a 1e-9 m match cannot come from a generic formula. (2) Swept surfaces: unit sweep
// versus scale*v. Writes controls.out.json.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const O=require('./own_eval.js');const {makeEval}=require('./run_eval_makeEval.js');
const V=O.V;
const ROOT='/home/user/dump-validation';
function load(rel){
  const buf=fs.readFileSync(path.join(ROOT,rel));
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  return {r,nodeAt,faceNode};
}
function errStats(E,f){const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices,all=[];
  for(let i=0;i<f.vertexCount;i++){const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];all.push(V.norm(V.sub(E.S(A[i],B[i]),X)));}
  const e=all.filter(Number.isFinite).sort((a,b)=>a-b);return {max:e.length?e[e.length-1]:null,p50:e.length?e[Math.floor(e.length/2)]:null,nonfinite:all.length-e.length,n:all.length};}
const out={perturb:[],swept:[]};
// ---- (1) perturbed analytic surfaces ----
for(const [rel,type] of [['test files new/SW2022/C13_cone/model.SLDPRT','CONE'],['test files new/SW2022/C14_sphere/model.SLDPRT','SPHERE']]){
  const {r,nodeAt,faceNode}=load(rel);
  const f=r.faces.find(x=>x.metadata&&x.metadata.scalarArrays.length===2);
  const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface);
  const base=makeEval(sn,nodeAt,{});
  const cases=[['as stored',{}],['radius +1e-6 m',{dr:1e-6}],['radius +1e-7 m',{dr:1e-7}],['x_axis rotated 1e-4 rad about axis',{rot:1e-4}],['u origin rotated by pi (x -> -x)',{rot:Math.PI}]];
  for(const [label,opt] of cases){
    const node={...sn,values:{...sn.values}};
    if(opt.dr)node.values.radius=sn.values.radius+opt.dr;
    if(opt.rot!==undefined){const a=V.unit(sn.values.axis||sn.values.axis),x=V.unit(sn.values.x_axis);
      const y=V.cross(a,x),c=Math.cos(opt.rot||0),s=Math.sin(opt.rot||0);
      node.values.x_axis=V.add(V.mul(x,c),V.mul(y,s));}
    const E=type==='CONE'?O.coneEval(node):O.sphereEval(node);
    const st=errStats(E,f);
    out.perturb.push({surface:type,file:rel,case:label,maxErr:st.max,p50:st.p50});
  }
}
// ---- (2) swept surfaces: sweep v unit vs scale*v ----
{
  const f0=load('test files original/Dekor.SLDPRT');
  const res={unit:[],scale:[]};
  for(const f of f0.r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const fn=f0.faceNode.get(f.metadata.rawId);if(!fn)continue;
    const sn=f0.nodeAt(fn.values.surface);if(sn.name!=='SWEPT_SURF')continue;
    for(const mode of ['unit','scale']){const E=O.sweptEval(sn,f0.nodeAt,mode);const st=errStats(E,f);res[mode].push(st);}
  }
  const med=a=>{const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
  const tot=m=>res[m].reduce((acc,x)=>({n:acc.n+x.n,nonfinite:acc.nonfinite+x.nonfinite}),{n:0,nonfinite:0});
  out.swept.push({file:'Dekor.SLDPRT',faces:res.unit.length,unit:{medianFaceP50:med(res.unit.map(x=>x.p50)),medianFaceMax:med(res.unit.map(x=>x.max)),vertsNonfinite:tot('unit').nonfinite,verts:tot('unit').n},scale:{medianFaceP50:med(res.scale.map(x=>x.p50)),medianFaceMax:med(res.scale.map(x=>x.max)),vertsNonfinite:tot('scale').nonfinite,verts:tot('scale').n}});
}
fs.writeFileSync(path.join(__dirname,'controls.out.json'),JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
