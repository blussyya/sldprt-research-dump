// EXP-118: face 75's hole chain against the native face's edges: curve type, radius, distance of the
// chain's vertices to each curve. Also which Block1 ids the display face carries, and on how many
// segments, against the native edges' display ids.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const H=JSON.parse(fs.readFileSync(process.argv[3])).find(h=>h.fi===75),pts=H.keys.map(k=>k.split(',').map(Number));
const nf=[...M.faces.values()].find(f=>f.id===2516),s=nf.surface;console.log('native face 2516',s.type,'r',s.r,'axis',s.a.map(x=>+x.toFixed(4)),'p',s.p.map(x=>+x.toFixed(5)),'sense',nf.sameSense);
for(const l of nf.loops){console.log(' loop');for(const ce of l.coedges){const e=M.edges.get(ce.edge),c=e.curve;
  let dmax=0,dmin=1e9;for(const p of pts){try{const q=G.curveProject(c,p).d;dmax=Math.max(dmax,q);dmin=Math.min(dmin,q);}catch(x){}}
  console.log('   edge',e.id,'displayId',e.displayId,c.type,c.r!==undefined?'r '+c.r:'',c.c?'centre '+c.c.map(x=>+x.toFixed(5)):'','| hole vertices to this curve: min',dmin.toExponential(2),'max',dmax.toExponential(2),'| tol',e.tolerance||0);}}
const f=d.faces[75],cnt=new Map();for(const e of f.edgeAnnotations)if(e.id)cnt.set(e.id,(cnt.get(e.id)||0)+1);
console.log('display face 75 Block1 ids (segments):',JSON.stringify([...cnt]),'| vertices',f.vertexCount,'triangles',f.triangleIndices.length/3);
let dsmax=0;for(const p of pts)dsmax=Math.max(dsmax,Math.abs(G.surfaceDistance(s,p).d));console.log('hole vertices to the cylinder: max',dsmax.toExponential(2));
// hole plane fit: normal via the chain's covariance-free approach: cross of spread
const c=[0,1,2].map(k=>pts.reduce((a,p)=>a+p[k],0)/pts.length);console.log('hole centre',c.map(x=>+x.toFixed(5)),'mean radius',(pts.reduce((a,p)=>a+G.dist(p,c),0)/pts.length*1000).toFixed(4),'mm');
