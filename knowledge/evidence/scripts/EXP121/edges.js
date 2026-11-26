// EXP-121: refit selected edges of a part the way the resolve does, fitting only the blends they lie
// on (each for the edge's own face). Prints each edge's fit error. CONV picks the converter copy.
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),memo=new Map(),out=m=>fs.writeSync(1,m+'\n');
for(const id of process.argv.slice(3).map(Number)){const e=[...M.edges.values()].find(x=>x.displayId===id);let c=e.curve;if(c.type==='trimmed')c=c.basis;
  const face=M.faces.find(f=>f.surface===c.surface&&f.loops.some(l=>l.coedges.some(co=>co.edge===e.id)));
  const key=c.surface.node+'@'+face.id;if(!memo.has(key))memo.set(key,F.blendSurface(c.surface,face,M,{tolerance:1e-8}).surface);
  const p=e.v.map(v=>M.vertices.get(v).p),r=F.edgeCurve(e,{...c,surface:memo.get(key)},p[0],p[1],{tolerance:1e-8,vertexTolerance:e.v.map(v=>M.vertices.get(v).tolerance||0)});
  out(`edge ${id}: error ${r.error.toExponential(2)}`);}
