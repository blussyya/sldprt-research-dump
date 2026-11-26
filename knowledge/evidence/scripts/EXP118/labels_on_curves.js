// EXP-118: do the display's labelled segments sit on the native curves they name? For each labelled
// segment of a display face, the distance of both its vertices to the named native edge's curve
// (circles exactly, intersection curves to their chart polyline). Control: the same segments against
// the face's other edges (a wrong-label reading would sit on those instead). Rim: unlabelled boundary
// vertices against every edge of the face.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const byDisp=new Map();for(const e of M.edges.values())byDisp.set(e.displayId,e);
const segDist=(p,a,b)=>{const ab=G.sub(b,a),t=Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/G.dot(ab,ab)));return G.dist(p,G.add(a,G.mul(ab,t)));};
const dCurve=(e,p)=>{const c=e.curve;if(c.type==='intersection'){const ch=c.chart.map(q=>q.p||q);let m=Infinity;for(let k=1;k<ch.length;k++)m=Math.min(m,segDist(p,ch[k-1],ch[k]));return m;}try{return G.curveProject(c,p).d;}catch(x){return NaN;}};
for(const fi of process.argv.slice(3).map(Number)){const f=d.faces[fi],V=i=>[0,1,2].map(k=>f.vertices[3*i+k]);
  const ids=[...new Set(f.edgeAnnotations.filter(e=>e.id).map(e=>e.id))];
  console.log(`display face ${fi}: labels ${JSON.stringify(ids)}; native edges found: ${ids.map(i=>byDisp.has(i)?i+':'+byDisp.get(i).curve.type:i+':none').join(' ')}`);
  for(const id of ids){const e=byDisp.get(id);if(!e)continue;let own=0,n=0,other={};
    for(const a of f.edgeAnnotations)if(a.id===id)for(const v of a.vertices){const p=V(v);own=Math.max(own,dCurve(e,p));n++;for(const id2 of ids)if(id2!==id&&byDisp.get(id2)){const x=dCurve(byDisp.get(id2),p);other[id2]=Math.min(other[id2]??Infinity,x);}}
    console.log(`   label ${id} (${n/2} segments): worst distance to its own curve ${own.toExponential(2)} m; nearest approach to the other edges: ${Object.entries(other).map(([k,v])=>k+' '+v.toExponential(1)).join(', ')}`);}
}
