'use strict';
// Are the outlier vertices (stored (u,v) off the native surface by more than 1e-7 m) on the face
// boundary? Boundary vertices are the endpoints of the Block1 edge annotations with a nonzero edge ID.
const fs=require('fs'),path=require('path');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');const {makeEval}=require('./run_eval_makeEval.js');
const V=O.V;
const R=JSON.parse(fs.readFileSync(path.join(__dirname,'run_eval.out.json'),'utf8')).results;
const want=new Set(R.filter(x=>x.status==='ok'&&x.err&&x.err.max>1e-7).map(x=>x.file+'|'+x.rawId));
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const rows={};
for(const pf of scan.perFile){
  if(![...want].some(k=>k.startsWith(pf.file+'|')))continue;
  const buf=fs.readFileSync('/home/user/dump-validation/'+pf.file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  let body;try{body=partition.readBody(buf,{}).parsed;}catch(e){continue;}
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2||!want.has(pf.file+'|'+f.metadata.rawId))continue;
    const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface),E=makeEval(sn,nodeAt,{});
    if(!E)continue;
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    const boundary=new Set();for(const e of (f.edgeAnnotations||[]))if(e.id!==0){boundary.add(e.vertices[0]);boundary.add(e.vertices[1]);}
    let outB=0,outI=0,allB=0,allI=0,maxIn=0,maxB=0;
    for(let i=0;i<f.vertexCount;i++){
      const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]],e=V.norm(V.sub(E.S(A[i],B[i]),X));const isB=boundary.has(i);
      if(isB)allB++;else allI++;
      if(e>1e-7){if(isB){outB++;maxB=Math.max(maxB,e);}else{outI++;maxIn=Math.max(maxIn,e);}}
    }
    const key=pf.file.replace('test files ','').slice(-40)+' | '+sn.name;
    rows[key]=rows[key]||{faces:0,boundaryVerts:0,interiorVerts:0,outlierOnBoundary:0,outlierInterior:0,maxErrBoundaryOutlier:0,maxErrInteriorOutlier:0};
    const g=rows[key];g.faces++;g.boundaryVerts+=allB;g.interiorVerts+=allI;g.outlierOnBoundary+=outB;g.outlierInterior+=outI;g.maxErrBoundaryOutlier=Math.max(g.maxErrBoundaryOutlier,maxB);g.maxErrInteriorOutlier=Math.max(g.maxErrInteriorOutlier,maxIn);
  }
}
for(const k of Object.keys(rows)){const g=rows[k];console.log(k.padEnd(62),'faces',String(g.faces).padEnd(3),'outliers on boundary',String(g.outlierOnBoundary).padEnd(5),'of',String(g.boundaryVerts).padEnd(6),'| interior outliers',String(g.outlierInterior).padEnd(5),'of',String(g.interiorVerts).padEnd(7),'| max err bnd',g.maxErrBoundaryOutlier.toExponential(2),'int',g.maxErrInteriorOutlier.toExponential(2));}
