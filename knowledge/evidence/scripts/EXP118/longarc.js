// EXP-118: is there any native edge along the long arc of the bore's bottom circle (h -6.2 mm, the
// 264 degrees between V2 and V1 that edge 1166 does not cover)? Samples every native edge (circles and
// lines by formula, intersection curves by chart points, all vertices) and reports any point within
// 1e-5 m of that arc.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const [file,nfS,cid]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed);
const e66=[...M.edges.values()].find(e=>e.displayId===+cid),c=e66.curve,B=G.cross(c.n,c.x),VP=id=>{const v=M.vertices.get(id);return v.p||v.point;};
const ang=p=>{const q=G.sub(p,c.c);let t=Math.atan2(G.dot(q,B),G.dot(q,c.x));return t<0?t+2*Math.PI:t;};
const a0=ang(VP(e66.v[0])),a1=ang(VP(e66.v[1]));// 1166 runs a0 -> a1 counter-clockwise about c.n (sameSense true)
const onShort=t=>{const s=((a1-a0)+2*Math.PI)%(2*Math.PI),u=((t-a0)+2*Math.PI)%(2*Math.PI);return u<=s+1e-9;};
const distArc=p=>{const q=G.sub(p,c.c),hgt=G.dot(q,c.n),pl=G.sub(q,c.n.map(x=>x*hgt)),rr=G.norm(pl);return Math.hypot(hgt,rr-c.r);};
const hits={};
for(const e of M.edges.values()){if(e===e66)continue;let pts=[];const k=e.curve&&e.curve.type;
  if(k==='circle')for(let i=0;i<720;i++)pts.push(G.curvePoint(e.curve,i/720*2*Math.PI));
  else if(k==='line'&&e.v&&e.v[0]!=null){const a=VP(e.v[0]),b=VP(e.v[1]);for(let i=0;i<=200;i++)pts.push(a.map((x,j)=>x+(b[j]-x)*i/200));}
  else if(e.curve&&e.curve.chart)pts=e.curve.chart.map(q=>q.p||q);
  if(e.v)for(const v of e.v)if(v!=null)pts.push(VP(v));
  for(const p of pts)if(distArc(p)<1e-5&&!onShort(ang(p))){hits[e.displayId+' '+k]=(hits[e.displayId+' '+k]||0)+1;}}
console.log(`circle ${cid}: short arc ${(((a1-a0)+2*Math.PI)%(2*Math.PI)*180/Math.PI).toFixed(1)} deg; native edge points within 1e-5 m of the rest of the circle:`,JSON.stringify(hits));
