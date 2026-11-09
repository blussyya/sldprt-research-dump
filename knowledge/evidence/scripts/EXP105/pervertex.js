// EXP-105: signed per-vertex radial error on chosen faces. usage: node pervertex.js part id...
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2],ids=process.argv.slice(3).map(Number);
const d=S.parse(f0),nat=N.build(S.readBrep(f0).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
for(const id of ids){const f=d.faces.find(f=>f.metadata&&f.metadata.rawId===id),s=nat.faces.find(x=>x.id===id).surface;
 console.log('face',id,s.type,'r',s.r,'sameSense',nat.faces.find(x=>x.id===id).sameSense);
 const v=f.vertices,n=f.vertexCount,t=f.triangleIndices;const used=new Set(t);
 for(let i=0;i<Math.min(n,40);i++){const p=[v[3*i],v[3*i+1],v[3*i+2]],q=sub(p,s.p),h=dot(q,s.a);
  const rad=Math.hypot(q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h);
  const tgt=s.type==='cone'?s.r+h*Math.tan(s.angle):s.r;
  console.log(i,'h',h.toExponential(3),'rad-target',(rad-tgt).toExponential(2));}}
