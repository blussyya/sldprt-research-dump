'use strict';
// For every linked SWEPT_SURF face: stored u range against the section's knot domain, and stored
// v range against 0..1, the sweep length |sweep| and scale. Output: counts plus per-face rows.
const fs=require('fs'),path=require('path');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/parasolid/partition.js');
const O=require('./own_eval.js');
const scan=JSON.parse(fs.readFileSync(path.join(__dirname,'scan_corpus.out.json'),'utf8'));
const rows=[];
for(const pf of scan.perFile){
  if(!pf.scalarFaces)continue;
  const buf=fs.readFileSync('/home/user/dump-validation/'+pf.file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
  let body;try{body=partition.readBody(buf,{}).parsed;}catch(e){continue;}
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2)continue;
    const fn=faceNode.get(f.metadata.rawId);if(!fn)continue;
    const sn=nodeAt(fn.values.surface);if(!sn||sn.name!=="SWEPT_SURF")continue;
    const sec=nodeAt(sn.values.section)||{name:"MISSING"};const nc=sec.name==='B_CURVE'?nodeAt(sec.values.nurbs):null;
    let dom=null;if(nc){const v=nc.values;const k=O.expandKnots(nodeAt(v.knot_mult).values.mult,nodeAt(v.knots).values.knots);dom=[k[v.degree],k[v.n_vertices]];}
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values;
    const amin=Math.min(...A),amax=Math.max(...A),bmin=Math.min(...B),bmax=Math.max(...B);
    const inside=dom?A.filter(a=>a>=dom[0]-1e-6&&a<=dom[1]+1e-6).length:null;
    rows.push({file:pf.file.replace('test files ',''),rawId:f.metadata.rawId,section:sec.name,dom,amin,amax,bmin,bmax,
      sweepLen:V_norm(sn.values.sweep),scale:sn.values.scale,nv:f.vertexCount,vertsInsideDomain:inside});
  }
}
function V_norm(a){return Math.hypot(a[0],a[1],a[2]);}
fs.writeFileSync(path.join(__dirname,'swept_range.out.json'),JSON.stringify(rows,null,1));
const byFile={};for(const x of rows){const k=x.file;byFile[k]=byFile[k]||{faces:0,nv:0,inside:0,bMaxLE1:0,bmax:[],secTypes:{}};const g=byFile[k];g.faces++;g.nv+=x.nv;g.inside+=(x.vertsInsideDomain||0);if(x.bmax<=1+1e-6&&x.bmin>=-1e-6)g.bMaxLE1++;g.bmax.push(x.bmax);g.secTypes[x.section]=(g.secTypes[x.section]||0)+1;}
for(const k of Object.keys(byFile)){const g=byFile[k];console.log(k.slice(-42).padEnd(43),'faces',String(g.faces).padEnd(4),'verts',String(g.nv).padEnd(6),'verts with u in section domain',String(g.inside).padEnd(6),'faces with v in [0,1]',g.bMaxLE1,'sections',JSON.stringify(g.secTypes));}
