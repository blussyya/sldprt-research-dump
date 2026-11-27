// EXP-122, after the blind prove agent: a closed SP_CURVE on a plane (5f8e9db3 edge 272). The fit on
// main and on the trim-seeded copy, against the edge itself (the basis between the trim's ends):
// the largest distance from fit to edge and from edge to fit, sampled both ways.
const fs=require('fs'),file=process.argv[2],id=+process.argv[3];
for(const [name,R] of [['main','/home/user/solidworks-converters'],['seeded',process.argv[4]]]){
  const S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
  const M=N.build(S.readBrep(fs.readFileSync(file)).parsed),e=M.edges.get(id),k=e.curve,c=k.basis,V=e.v.map(v=>M.vertices.get(v));
  const r=F.edgeCurve(e,c,V[0].p,V[1].p,{tolerance:1e-8,vertexTolerance:V.map(v=>v.tolerance||0)});
  const fit=t=>G.curvePoint(r.curve,t),edge=t=>G.curvePoint(c,t),n=2000;
  let a=0,b=0;for(let i=0;i<=n;i++){const p=fit(r.t0+(r.t1-r.t0)*i/n);let m=Infinity;for(let j=0;j<=n;j++)m=Math.min(m,G.dist(p,edge(k.t0+(k.t1-k.t0)*j/n)));a=Math.max(a,m);}
  for(let j=0;j<=n;j++){const p=edge(k.t0+(k.t1-k.t0)*j/n);let m=Infinity;for(let i=0;i<=n;i++)m=Math.min(m,G.dist(p,fit(r.t0+(r.t1-r.t0)*i/n)));b=Math.max(b,m);}
  console.log(`${name}: surface ${c.surface.type}, trim ${k.t0}..${k.t1}, fit range ${r.t0}..${r.t1}, reported error ${r.error}; fit to edge ${a.toExponential(2)} m, edge to fit ${b.toExponential(2)} m (sampled, chord ~ ${(G.dist(edge(k.t0),edge(k.t0+(k.t1-k.t0)/n))).toExponential(1)} m)`);
  for(const key of Object.keys(require.cache))if(key.startsWith(R))delete require.cache[key];}
