// EXP-118: face 448 is face 75 mirrored in x = 0. Mirror native circles 1165 and 1166 (x -> -x) and
// measure face 448's labelled segments against them; which native edges actually sit at the mirrored
// positions, and their display ids against the labels face 448 carries.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),f=d.faces[448],V=i=>[0,1,2].map(k=>f.vertices[3*i+k]);
const E=id=>[...M.edges.values()].find(x=>x.displayId===id),mir=v=>[-v[0],v[1],v[2]];
const mc=c=>({...c,c:mir(c.c),n:mir(c.n).map(x=>-x),x:mir(c.x)});
for(const id of [1165,1166]){const c=mc(E(id).curve);const by={};
  for(const a of f.edgeAnnotations)if(a.id){const dd=Math.max(...a.vertices.map(v=>G.curveProject(c,V(v)).d));by[a.id]=Math.min(by[a.id]??Infinity,dd);}
  // native edges whose curve matches the mirrored circle
  const twin=[...M.edges.values()].filter(e=>e.curve.type==='circle'&&G.dist(e.curve.c,c.c)<1e-7&&Math.abs(e.curve.r-c.r)<1e-9).map(e=>e.displayId);
  console.log(`mirror of ${id}: closest label segments ${Object.entries(by).map(([k,v])=>k+' '+v.toExponential(1)).join(', ')} | native edge(s) on the mirrored circle: display id ${twin.join(',')}`);}
const cnt={};for(const a of f.edgeAnnotations)if(a.id)cnt[a.id]=(cnt[a.id]||0)+1;console.log('face 448 labels (segments):',JSON.stringify(cnt));
