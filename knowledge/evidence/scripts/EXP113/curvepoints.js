// EXP-113: are the display vertices that sit off a cylinder or cone face points of the face's
// edge curve (for example a B-spline edge), or points on a straight chord?
// For every vertex further than BAR from the joined native surface, measure:
//   d_surf  distance to the face's own surface
//   d_curve distance to the edge curve of each boundary segment it sits on (Block1 id -> native edge)
//   d_chord distance to the chord between its two boundary neighbours (same Block1 edge)
// usage: node curvepoints.js <part> [resolve]   (resolve: fit intersection/blend curves first)
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),
  J=require(R+'/src/brep/display-join'),G=require(R+'/src/geom/eval'),fs=require('fs');
const BAR=1e-7,file=process.argv[2],buf=fs.readFileSync(file);
const d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
let edges=M.edges;
if(process.argv[3]==='resolve'){try{edges=require(R+'/src/brep/procedural').resolve(M).edges;}catch(e){console.error('resolve failed:',e.message);}}
const joins=J.join(d.faces,M),edgeOf=id=>edges.get?edges.get(id):edges[id];
const segDist=(p,a,b)=>{const ab=G.sub(b,a),t=Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/G.dot(ab,ab)));return G.dist(p,G.add(a,G.mul(ab,t)));};
const rows=[],ctrl={n:0,max:0};
d.faces.forEach((df,fi)=>{
  const jj=joins[fi],nf=jj&&jj.face;if(!nf||!['cylinder','cone'].includes(nf.surface.type)||!df.edgeAnnotations)return;
  const byDisp=new Map();
  // display ids live on the native edges; a resolved edge keeps the node id but may drop displayId
  for(const l of nf.loops)for(const ce of l.coedges){const ne=M.edges.get(ce.edge),e=edgeOf(ce.edge)||ne;if(!ne)continue;
    const k=ne.displayId!==undefined?ne.displayId:ne.id;if(!byDisp.has(k))byDisp.set(k,[]);byDisp.get(k).push({...e,tolerance:ne.tolerance});}
  const V=i=>[0,1,2].map(k=>df.vertices[3*i+k]);
  const segs=df.edgeAnnotations.filter(a=>a.id!==0);
  for(let i=0;i<df.vertexCount;i++){
    const p=V(i),ds=Math.abs(G.surfaceDistance(nf.surface,p).d);
    if(!(ds>BAR)){ // control: an on-surface boundary vertex must sit on its edge curve
      if(ds<1e-9&&ctrl.n<400){const a=segs.find(a=>a.vertices[0]===i||a.vertices[1]===i);
        if(a)for(const e of byDisp.get(a.id)||[]){try{if(e.curve){ctrl.n++;ctrl.max=Math.max(ctrl.max,G.curveProject(e.curve,p).d);}}catch(x){}}}
      continue;}
    const mine=segs.filter(a=>a.vertices[0]===i||a.vertices[1]===i);if(!mine.length){rows.push({fi,i,ds,where:'not on a Block1 edge'});continue;}
    for(const id of new Set(mine.map(a=>a.id))){
      const nb=mine.filter(a=>a.id===id).map(a=>a.vertices[0]===i?a.vertices[1]:a.vertices[0]);
      const chord=nb.length===2?segDist(p,V(nb[0]),V(nb[1])):null;
      for(const e of byDisp.get(id)||[{curve:null}]){
        let dc=null,type=e.curve?e.curve.type:'no native edge';
        try{if(e.curve)dc=G.curveProject(e.curve,p).d;}catch(x){type+=' (not evaluable)';}
        rows.push({fi,i,ds,edge:id,type,tol:e.tolerance||0,dc,chord});
      }
    }
  }
});
const out=require('path').basename(file).slice(0,28);
const by={};for(const r of rows){const k=r.type||r.where;(by[k]=by[k]||[]).push(r);}
console.log(out,'rows',rows.length,'| control: on-surface boundary vertices',ctrl.n,'max d_curve',ctrl.max.toExponential(2));
for(const [k,rs] of Object.entries(by)){
  const ev=rs.filter(r=>r.dc!==null&&r.dc!==undefined),ch=rs.filter(r=>r.chord!==null&&r.chord!==undefined);
  const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:NaN;};
  const onCurve=ev.filter(r=>r.dc<Math.max(1e-7,r.ds/10)).length,onChord=ch.filter(r=>r.chord<1e-7).length;
  console.log('  ',k.padEnd(28),'n',rs.length,'| d_surf med',med(rs.map(r=>r.ds)).toExponential(2),'max',Math.max(...rs.map(r=>r.ds)).toExponential(2),
    '| d_curve med',ev.length?med(ev.map(r=>r.dc)).toExponential(2):'-','on curve (<max(1e-7,d_surf/10))',onCurve+'/'+ev.length,
    '| on chord (<1e-7)',onChord+'/'+ch.length,'| tolerant edges',rs.filter(r=>r.tol>1e-7).length);
}
fs.writeFileSync(process.env.OUT||'/dev/null',rows.map(r=>JSON.stringify(r)).join('\n'));
