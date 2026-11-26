// EXP-118: does any other display face cover face 75's gap? Display faces with vertices on the bore
// cylinder (within 1e-8 m of native face 2516's surface) and within 2 mm of the ring's centre, and
// native faces 2516 and 2521: their loops and edge display ids.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nfs=[...M.faces.values()],surf=nfs.find(x=>x.id===2516).surface,C=[0.04589,0.01131,0.03131];
d.faces.forEach((f,fi)=>{let n=0;for(let i=0;i<f.vertexCount;i++){const p=[0,1,2].map(k=>f.vertices[3*i+k]);if(G.dist(p,C)<0.002&&Math.abs(G.surfaceDistance(surf,p).d)<1e-8)n++;}
  if(n){const ids=[...new Set(f.edgeAnnotations.filter(e=>e.id).map(e=>e.id))];console.log('display face',fi,'vertices on the bore near the ring:',n,'of',f.vertexCount,'| Block1 ids',JSON.stringify(ids));}});
for(const id of [2516,2521]){const nf=nfs.find(x=>x.id===id);console.log('native',id,nf.surface.type,'axis',nf.surface.a.map(x=>+x.toFixed(4)),'p',nf.surface.p.map(x=>+x.toFixed(5)),'loops',nf.loops.map(l=>l.coedges.map(ce=>{const e=M.edges.get(ce.edge);return e.displayId+':'+e.curve.type;}).join(' ')).join(' | '));}
