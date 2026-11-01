// Dump what's needed to picture blend 3369's spine on head_back: the display mesh near it, offset
// surface 3368 inside and past its knot range, and the spine's stored chart points.
// node dump_region.js part.sldprt out.json
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const file=process.argv[2],M=N.build(S.readBrep(file).parsed);
const f=M.faces.find(x=>x.id===2478),b=f.surface;let sp=b.spine;if(sp.type==='trimmed')sp=sp.basis;
const off=sp.surfaces.find(s=>s.type==='offset'),[[u0,u1],[v0,v1]]=G.surfaceRange(off);
const grid=(ua,ub,va,vb,n)=>{const g=[];for(let i=0;i<=n;i++){const r=[];for(let j=0;j<=n;j++)r.push(G.surfaceEval(off,ua+(ub-ua)*i/n,va+(vb-va)*j/n).p);g.push(r);}return g;};
const ur=[-26,-8];   // u span the spine uses (chart points run u -20.6 .. -13.1)
const out={chart:sp.chart,knotEdgeV:v1,
  inside:grid(ur[0],ur[1],20,v1,24),            // stored patch
  beyond:grid(ur[0],ur[1],v1,82,24),            // flat extension past the knot range
  mesh:[]};
const mesh=S.parse?S.parse(require('fs').readFileSync(file)):null;
const c=sp.chart.reduce((a,p)=>a.map((x,k)=>x+p[k]/sp.chart.length),[0,0,0]);
if(mesh){const tri=mesh.triangles||[];for(const t of tri){const ps=t.length===3&&Array.isArray(t[0])?t:null;if(ps&&ps.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2])<0.06))out.mesh.push(ps);}}
out.meshKeys=mesh?Object.keys(mesh):null;out.centre=c;
require('fs').writeFileSync(process.argv[3],JSON.stringify(out));
console.log('knot edge v',v1,'mesh tris near',out.mesh.length,'mesh keys',out.meshKeys);
