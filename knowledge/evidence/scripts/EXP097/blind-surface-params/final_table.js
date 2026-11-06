'use strict';
// Final tally over the usable joins (status ok in run_eval.out.json), by native surface type, with
// vertices split into face-boundary and interior (boundary = endpoints of nonzero-ID edge annotations).
const fs=require('fs');
const display=require('/home/user/dump-validation/package/src/display.js');
const {inflateRaw,inflateZlib}=require('/home/user/dump-validation/package/src/index.js');
const partition=require('/home/user/dump-validation/package/src/partition.js'.replace('/src/partition.js','/src/parasolid/partition.js'));
const O=require('./own_eval.js');const {makeEval}=require('./run_eval_makeEval.js');const V=O.V;
const R=JSON.parse(fs.readFileSync(__dirname+'/run_eval.out.json','utf8')).results.filter(x=>x.status==='ok');
const want=new Set(R.map(x=>x.file+'|'+x.rawId));
const scan=JSON.parse(fs.readFileSync(__dirname+'/scan_corpus.out.json','utf8'));
const T={};
for(const pf of scan.perFile){
  if(![...want].some(k=>k.startsWith(pf.file+'|')))continue;
  const buf=fs.readFileSync('/home/user/dump-validation/'+pf.file);
  const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);const body=partition.readBody(buf,{}).parsed;
  const byIdx=new Map(body.nodes.map(n=>[n.index,n])),nodeAt=i=>byIdx.get(i);
  const faceNode=new Map(body.nodes.filter(n=>n.type===14).map(n=>[n.values.node_id,n]));
  for(const f of r.faces){
    if(!f.metadata||f.metadata.scalarArrays.length!==2||!want.has(pf.file+'|'+f.metadata.rawId))continue;
    const fn=faceNode.get(f.metadata.rawId),sn=nodeAt(fn.values.surface),E=makeEval(sn,nodeAt,{});
    const A=f.metadata.scalarArrays[0].values,B=f.metadata.scalarArrays[1].values,Vx=f.vertices;
    const bnd=new Set();for(const e of f.edgeAnnotations)if(e.id!==0){bnd.add(e.vertices[0]);bnd.add(e.vertices[1]);}
    const t=T[sn.name]=T[sn.name]||{faces:0,verts:0,nonfinite:0,bnd:0,int:0,le1e7:0,le1e6:0,max:0,bndMax:0,intMax:0,bndOut:0,intOut:0,facesWithOver1e6:0};
    t.faces++;let over=false;
    for(let i=0;i<f.vertexCount;i++){t.verts++;const X=[Vx[3*i],Vx[3*i+1],Vx[3*i+2]];const e=V.norm(V.sub(E.S(A[i],B[i]),X));
      const isB=bnd.has(i);if(isB)t.bnd++;else t.int++;
      if(!Number.isFinite(e)){t.nonfinite++;continue;}
      if(e<=1e-7)t.le1e7++;if(e<=1e-6)t.le1e6++;else over=true;
      t.max=Math.max(t.max,e);if(isB){t.bndMax=Math.max(t.bndMax,e);if(e>1e-7)t.bndOut++;}else{t.intMax=Math.max(t.intMax,e);if(e>1e-7)t.intOut++;}}
    if(over)t.facesWithOver1e6++;
  }
}
const f=x=>x.toExponential(2);
const lines=[];
lines.push('type | faces | verts | nonfinite | boundary verts | interior verts | verts <=1e-7 m | verts <=1e-6 m | max finite err | boundary max | interior max | boundary >1e-7 | interior >1e-7 | faces with any >1e-6');
for(const k of Object.keys(T)){const t=T[k];lines.push([k,t.faces,t.verts,t.nonfinite,t.bnd,t.int,t.le1e7,t.le1e6,f(t.max),f(t.bndMax),f(t.intMax),t.bndOut,t.intOut,t.facesWithOver1e6].join(' | '));}
const tot=Object.values(T).reduce((a,t)=>({faces:a.faces+t.faces,verts:a.verts+t.verts,nonfinite:a.nonfinite+t.nonfinite,le1e7:a.le1e7+t.le1e7,le1e6:a.le1e6+t.le1e6,bnd:a.bnd+t.bnd,int:a.int+t.int,intOut:a.intOut+t.intOut,bndOut:a.bndOut+t.bndOut}),{faces:0,verts:0,nonfinite:0,le1e7:0,le1e6:0,bnd:0,int:0,intOut:0,bndOut:0});
lines.push('TOTAL | '+Object.values(tot).join(' | '));
fs.writeFileSync(__dirname+'/final_table.out.txt',lines.join('\n')+'\n');
console.log(lines.join('\n'));
