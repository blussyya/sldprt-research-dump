// Stored analytic box of display faces 75 and 448 against (a) the box of the native face's edges
// (sampled along their branches) and (b) the box of the display mesh. Control: the same numbers for
// every other cylinder-like face in the file whose display mesh closes (how often the mesh leaves the
// stored box, and by how much).
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const box=ps=>[[0,1,2].map(k=>Math.min(...ps.map(p=>p[k]))),[0,1,2].map(k=>Math.max(...ps.map(p=>p[k])))];
const out=(f)=>{const ps=[];for(let i=0;i<f.vertexCount;i++)ps.push([f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);const [lo,hi]=box(ps);return Math.max(0,...[0,1,2].map(k=>f.bounds.min[k]-lo[k]),...[0,1,2].map(k=>hi[k]-f.bounds.max[k]));};
for(const [di,nid] of [[75,2516],[448,12990]]){const f=d.faces[di],nf=M.faces.find(x=>x.id===nid);
  const eps=nf.loops.flatMap(l=>l.coedges.flatMap(c=>B.branch(M,M.edges.get(c.edge),false)));const [elo,ehi]=box(eps);
  console.log('face',di,'stored min',f.bounds.min.map(x=>x.toFixed(6)),'max',f.bounds.max.map(x=>x.toFixed(6)));
  console.log('   native edges box min',elo.map(x=>x.toFixed(6)),'max',ehi.map(x=>x.toFixed(6)));
  console.log('   mesh outside stored box by',(out(f)*1000).toFixed(4),'mm');}
const all=d.faces.map((f,i)=>({i,o:f.bounds?out(f):0})).filter(x=>x.o>1e-6).sort((a,b)=>b.o-a.o);
console.log('faces whose mesh leaves the stored box by >1e-6 m:',all.length,'top',all.slice(0,8).map(x=>x.i+':'+(x.o*1000).toFixed(4)+'mm').join(' '));
