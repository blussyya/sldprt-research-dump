'use strict';
// NQ-029: compare the plain cube with the later split-line control in both saved eras.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..'),R=path.join(root,'../solidworks-converters/src');
const D=require(R+'/display'),M=require(R+'/container/modern'),O=require(R+'/container/ole');
const Z=require(R+'/inflate'),P=require(R+'/parasolid/partition'),X=require(R+'/parasolid/xt');
const N=require(R+'/brep/native');

const close=(a,b)=>Math.abs(a-b)<1e-9;
function label(box){
  const [lo,hi]=[box.min,box.max];
  if(close(lo[0],hi[0]))return close(lo[0],0)?'-X':'+X';
  if(close(lo[1],hi[1]))return close(lo[1],0)?'-Y':'+Y';
  if(close(lo[2],hi[2])){
    if(close(lo[2],0))return '-Z';
    if(close(lo[1],0)&&close(hi[1],.005))return '+Z low';
    if(close(lo[1],.005)&&close(hi[1],.01))return '+Z high';
    return '+Z';
  }
  return '?';
}
function pointKey(p){return p.map(x=>Object.is(x,-0)?0:x).join(',');}
function display(file){
  const raw=fs.readFileSync(file),legacy=M.isOLE2(raw);
  const stream=legacy?O.displayLists(raw,Z.inflate).bytes:M.findDisplayLists(raw,Z.inflateRaw,Z.inflate);
  const parsed=D.extractDisplayLists(stream,legacy),b=Buffer.from(stream);
  return {sha256:crypto.createHash('sha256').update(raw).digest('hex'),faces:parsed.faces.map(f=>{
    const words=Array.from({length:f.block1.length},(_,i)=>b.readUInt32LE(f.offsets.block1+16+4*i));
    const points=[];for(let i=0;i<f.vertices.length;i+=3)points.push([f.vertices[i],f.vertices[i+1],f.vertices[i+2]]);
    return {label:label(f.bounds),rawId:f.metadata?.rawId??null,bounds:f.bounds,vertices:[...new Set(points.map(pointKey))].sort(),
      block1:[...f.block1],rawMatch:JSON.stringify(words)===JSON.stringify([...f.block1]),stripLengths:f.stripLengths};
  })};
}
function native(file){
  const streams=P.streams(fs.readFileSync(file)),key=Object.keys(streams).find(k=>/Config-0-Partition$/.test(k));
  const model=N.build(X.parse(P.sections(streams[key],0).out[0].body,true));
  function faceBox(face){
    const points=[];for(const loop of face.loops)for(const co of loop.coedges){const edge=model.edges.get(co.edge);for(const v of edge?.v||[])if(v)points.push(model.vertices.get(v).p);}
    return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};
  }
  return model.faces.map(f=>({id:f.id,label:label(faceBox(f)),edges:[...new Set(f.loops.flatMap(l=>l.coedges.map(c=>c.edge)))]}));
}
function inspect(era){
  const dir=path.join(root,'test files new',era),baseFile=path.join(dir,'C00_cube_10mm/model.SLDPRT'),splitFile=path.join(dir,'C18_cube_split_line/model.SLDPRT');
  const base=display(baseFile),split=display(splitFile),baseNative=native(baseFile),splitNative=native(splitFile);
  const baseIds=new Set(baseNative.map(f=>f.id)),newTop=splitNative.filter(f=>f.label.startsWith('+Z')&&!baseIds.has(f.id));
  const sides=['-X','+X','-Y','+Y'].map(side=>{
    const a=base.faces.find(f=>f.label===side),b=split.faces.find(f=>f.label===side),nf=splitNative.find(f=>f.label===side);
    const sharedWithNewTop=[...new Set(newTop.flatMap(t=>nf.edges.filter(e=>t.edges.includes(e))))];
    return {side,baseRawId:a.rawId,splitRawId:b.rawId,verticesBefore:a.vertices.length,verticesAfter:b.vertices.length,
      verticesIdentical:JSON.stringify(a.vertices)===JSON.stringify(b.vertices),block1Before:a.block1,block1After:b.block1,
      block1Identical:JSON.stringify(a.block1)===JSON.stringify(b.block1),rawMatches:a.rawMatch&&b.rawMatch,
      nativeId:nf.id,nativeEdges:nf.edges,sharedWithNewTop};
  });
  return {era,base:{file:path.relative(root,baseFile),sha256:base.sha256,faces:base.faces.length},
    split:{file:path.relative(root,splitFile),sha256:split.sha256,faces:split.faces.length},newTop,sides};
}
const results={runs:['SW2011','SW2022'].map(inspect)};
results.summary={eras:results.runs.length,newFaceAdjacencyUnchanged:results.runs.flatMap(r=>r.sides).filter(s=>s.sharedWithNewTop.length&&s.verticesIdentical&&s.block1Identical).length,
  boundaryChangedAndBlock1Changed:results.runs.flatMap(r=>r.sides).filter(s=>!s.verticesIdentical&&!s.block1Identical).length,
  rawMismatches:results.runs.flatMap(r=>r.sides).filter(s=>!s.rawMatches).length};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
