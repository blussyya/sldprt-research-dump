#!/usr/bin/env node
'use strict';
/* The two optional float arrays have one value per display vertex. This checks the concrete
 * hypothesis that they are the surface's (u,v) parameters. The controlled cone, sphere and
 * B-surface are useful because their exact native surfaces are available in the same file.
 * A swapped-array control makes the test discriminating: two generic scalar arrays should not
 * reconstruct the same points only in their stored order. */
const fs=require('fs'),path=require('path');
const S=require('../../../../package'),G=require('../../../../package/src/geom/eval');
const {ROOT,corpusFiles,relative}=require('./common');

const controls=[
  'test files new/SW2022/C13_cone/model.SLDPRT',
  'test files new/SW2022/C14_sphere/model.SLDPRT',
  'test files new/SW2022/C16_loft_spline/model.SLDPRT'
].map(p=>path.join(ROOT,p));
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,k)=>a.map(x=>x*k);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

function evalUV(s,u,v){
  if(s.type==='cone'){
    // The saved cone's v is axial distance. The neutral B-rep uses distance along the generator.
    v/=Math.cos(s.angle);
    const y=cross(s.a,s.x),r=add(mul(s.x,Math.cos(u)),mul(y,Math.sin(u)));
    const rho=s.r+v*Math.sin(s.angle);
    return add(s.p,add(mul(r,rho),mul(s.a,v*Math.cos(s.angle))));
  }
  if(s.type==='sphere'){
    const y=cross(s.a,s.x),r=add(mul(s.x,Math.cos(u)),mul(y,Math.sin(u)));
    return add(s.c,add(mul(r,s.r*Math.cos(v)),mul(s.a,s.r*Math.sin(v))));
  }
  if(s.type==='bspline')return G.bsplineSurface(s,u,v).p;
  throw Error('unsupported control surface '+s.type);
}

function errors(face,a,b){
  let max=0,sum=0;
  for(let i=0;i<face.mesh.vertexCount;i++){
    const p=[face.mesh.vertices[3*i],face.mesh.vertices[3*i+1],face.mesh.vertices[3*i+2]];
    const d=dist(p,evalUV(face.brep.surface,a[i],b[i]));max=Math.max(max,d);sum+=d;
  }
  return {max,mean:sum/face.mesh.vertexCount};
}

const occurrence={files:0,faces:0,vertices:0,byTag:{},byYear:{},parseErrors:[]};
for(const file of corpusFiles()){
  let p;try{p=S.parse(file);}catch(e){occurrence.parseErrors.push({file:relative(file),error:e.message});continue;}
  const faces=p.faces.filter(f=>f.metadata&&f.metadata.scalarFlag===1);
  if(!faces.length)continue;
  occurrence.files++;
  const year=(relative(file).match(/test files online\/(\d{4})\//)||[])[1]||'controlled/original';
  occurrence.byYear[year]=(occurrence.byYear[year]||0)+faces.length;
  for(const f of faces){
    occurrence.faces++;occurrence.vertices+=f.vertexCount;
    const tag=String(f.metadata.typeTag);occurrence.byTag[tag]=(occurrence.byTag[tag]||0)+1;
  }
}

const evaluated=[];
for(const file of controls){
  const linked=S.link(file);
  for(const face of linked.faces.filter(f=>f.mesh.metadata&&f.mesh.metadata.scalarFlag===1)){
    const [u,v]=face.mesh.metadata.scalarArrays.map(a=>a.values);
    evaluated.push({file:relative(file),faceId:face.id,type:face.brep.surface.type,
      vertices:face.mesh.vertexCount,storedOrder:errors(face,u,v),swapped:errors(face,v,u),
      u:{min:Math.min(...u),max:Math.max(...u),distinct:new Set(u).size},
      v:{min:Math.min(...v),max:Math.max(...v),distinct:new Set(v).size}});
  }
}
const result={occurrence,evaluated,summary:{
  evaluatedFaces:evaluated.length,evaluatedVertices:evaluated.reduce((n,x)=>n+x.vertices,0),
  storedMax:Math.max(...evaluated.map(x=>x.storedOrder.max)),
  swappedMin:Math.min(...evaluated.map(x=>x.swapped.max))
}};
fs.writeFileSync(path.join(__dirname,'scalar-parameters.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
