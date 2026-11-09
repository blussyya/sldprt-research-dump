// EXP-103: run the edge fit for every edge on surfaces nodes A and B of a part, and show how far Parasolid's chart
// points are from each surface (plane/analytic distance, so independent of the foot finder).
// usage: CONV=<repo> node edge.js part nodeA nodeB
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed),want=[+process.argv[3],+process.argv[4]].sort().join();
for(const e of n.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||c.surfaces.map(s=>s.node).sort().join()!==want)continue;
  const p0=e.v?n.vertices.get(e.v[0]).p:null,p1=e.v?n.vertices.get(e.v[1]).p:null;
  const faceOf=new Map(n.faces.map(f=>[f.id,f]));
  console.log('edge',e.id,'chart',c.chart.length);
  for(const s of c.surfaces)if(s.type==='plane')console.log(' chart distances to plane',s.node,c.chart.map(q=>Math.abs(G.surfaceDistance(s,q).d).toExponential(1)).join(' '));
  try{const t=Date.now(),r=F.edgeCurve(e,c,p0,p1,{tolerance:1e-8,faceOf});console.log(' fit error',r.error.toExponential(2),'samples',r.samples,(Date.now()-t)+'ms');}catch(x){console.log(' threw',x.message);}
}
