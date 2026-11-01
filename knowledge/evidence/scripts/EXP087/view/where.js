const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed);
const f=M.faces.find(x=>x.id===2478),b=f.surface;let sp=b.spine;if(sp.type==='trimmed')sp=sp.basis;
const off=sp.surfaces.find(s=>s.type==='offset');
console.log('offset node',off.node,'range u,v',JSON.stringify(G.surfaceRange(off)),'basis',off.basis.type,off.basis.node);
// solve the (u,v) of a 3D point that lies on the offset, with no clamping: Newton on |off(u,v)-p|
function uvOf(p){let best=null;for(let u0=-40;u0<=40;u0+=4)for(let v0=0;v0<=140;v0+=4){let u=u0,v=v0;
  for(let it=0;it<200;it++){const e=G.surfaceEval(off,u,v),r=[e.p[0]-p[0],e.p[1]-p[1],e.p[2]-p[2]];
    const a=[[dot(e.du,e.du),dot(e.du,e.dv)],[dot(e.du,e.dv),dot(e.dv,e.dv)]],g=[dot(r,e.du),dot(r,e.dv)],d=a[0][0]*a[1][1]-a[0][1]*a[1][0];if(!d)break;
    u-= (a[1][1]*g[0]-a[0][1]*g[1])/d;v-=(-a[1][0]*g[0]+a[0][0]*g[1])/d;if(Math.abs(u)>1e3||Math.abs(v)>1e3)break;}
  const dd=G.dist(G.surfaceEval(off,u,v).p,p);if(!best||dd<best.d)best={u,v,d:dd};}return best;}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
const show=(tag,p)=>{const r=uvOf(p);console.log(tag,'u',r.u.toFixed(3),'v',r.v.toFixed(3),'off by',r.d.toExponential(1));};
console.log('stored chart points:',sp.chart.length);sp.chart.forEach((p,k)=>show(' chart '+k,p));
if(sp.start)show(' spine start',sp.start.p);if(sp.end)show(' spine end',sp.end.p);
console.log('face keys',Object.keys(f).join(','));
const vids=new Set();for(const e of M.edges.values()){const fs=e.faces||(e.fins||[]).map(x=>x.face&&x.face.id);if(fs&&fs.some(x=>x===2478||(x&&x.id===2478)))e.v.forEach(v=>vids.add(v));}
const spc=G.curveRange?null:null;
for(const v of vids){const p=M.vertices.get(v).p,r=uvOf(p);console.log(' face vertex',v,'nearest on offset3368: u',r.u.toFixed(3),'v',r.v.toFixed(3),'dist',r.d.toExponential(2));}
