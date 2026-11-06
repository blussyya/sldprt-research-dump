'use strict';
// Per-vertex look at the linked faces whose max error is above 1e-7 m: where (u,v) sits in the
// domain, how far the display vertex is from the native surface by a dense sample (independent of
// the (u,v) arrays), and the local float32 floor. Writes outliers.out.json.
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const O=require('./own_eval.js');
const ROOT='/home/user/dump-validation';
const R=JSON.parse(fs.readFileSync(path.join(__dirname,'run_eval.out.json'),'utf8')).results;
const want=new Set(R.filter(x=>x.status==='ok'&&x.err&&x.err.max>1e-7).map(x=>x.file+'|'+x.rawId));
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const TAG2NAME={4001:'PLANE',4002:'CYLINDER',4003:'CONE',4004:'SPHERE',4005:'TORUS',4006:'B_SURFACE',4007:'BLENDED_EDGE',4009:'SWEPT_SURF'};
const out=[];
const mk=require('./run_eval_makeEval.js');
for(const pf of scan.perFile){
  if(![...want].some(k=>k.startsWith(pf.file+'|')))continue;
  const buf=fs.readFileSync(path.join(ROOT,pf.file));
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    if(!want.has(pf.file+'|'+f.metadata.rawId))continue;
    const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface),E=mk.makeEval(sn,nodeAt,{});
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    const [[u0,u1],[v0,v1]]=E.domain.map(d=>d.map(x=>x));
    // dense sample of the surface for a distance that does not use the arrays
    const NS=(E.domain[0][0]===-Infinity||!isFinite(E.domain[0][1]-E.domain[0][0]))?null:1;
    const rows=[];
    for(let i=0;i<f.vertexCount;i++){
      const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]],u=A[i],v=B[i];
      const e=O.V.norm(O.V.sub(E.S(u,v),X));
      if(e<=1e-7)continue;
      rows.push({i,u,v,err:e,inDomain:(isFinite(u0)?(u>=u0-1e-9&&u<=u1+1e-9):true)&&(isFinite(v0)?(v>=v0-1e-9&&v<=v1+1e-9):true),X});
    }
    if(!rows.length)continue;
    // distance from each outlier vertex to a dense grid of the surface (independent of its (u,v))
    if(E.domain.every(d=>isFinite(d[0])&&isFinite(d[1]))){
      const G=200;let grid=[];for(let a=0;a<=G;a++)for(let b=0;b<=G;b++){const uu=u0+(u1-u0)*a/G,vv=v0+(v1-v0)*b/G;grid.push(E.S(uu,vv));}
      for(const row of rows){let best=Infinity;for(const p of grid){const d=O.V.norm(O.V.sub(p,row.X));if(d<best)best=d;}row.gridDist=best;delete row.X;}
    }else{for(const row of rows){row.gridDist=null;delete row.X;}}
    out.push({file:pf.file,rawId:f.metadata.rawId,native:sn.name,nv:f.vertexCount,domain:E.domain,outliers:rows.length,outlierInDomain:rows.filter(x=>x.inDomain).length,sample:rows.slice(0,6)});
  }
}
fs.writeFileSync(path.join(__dirname,'outliers.out.json'),JSON.stringify(out,null,1));
for(const o of out)console.log(o.file.replace('test files ','').slice(-38),o.native,'nv',o.nv,'outliers',o.outliers,'inDomain',o.outlierInDomain,'domain',JSON.stringify(o.domain).slice(0,80),'sample',o.sample.slice(0,3).map(s=>`(u=${s.u.toFixed(4)},v=${s.v.toFixed(4)},err=${s.err.toExponential(2)},gridDist=${s.gridDist==null?'-':s.gridDist.toExponential(2)})`).join(' '));
