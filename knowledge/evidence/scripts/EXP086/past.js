// Does the spine of head_back's blend 10239 carry on past its T limit? March out from the limit
// along the spine's end tangent and correct each step onto offset 10238 ∩ blend 10237.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===10239){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;const [S1,S2]=c.surfaces;
const sp=F.spineOf(b,1e-8).curve,[lo,hi]=G.curveRange(sp),E=G.curvePoint(sp,hi),T=G.unit(G.curveTangent(sp,hi));
console.log('end type',c.end.type,'E-limit',G.dist(E,c.end.p));
let X=c.end.p,cache=new Map();
for(let k=1;k<=12;k++){const g=G.add(c.end.p,G.mul(T,k*0.5e-3));
  try{const Y=F.corrector(S1,S2,g,T,cache);console.log((k*0.5).toFixed(1),'mm  off guess',(G.dist(Y,g)*1e6).toFixed(2),'um  along',(G.dot(G.sub(Y,c.end.p),T)*1e3).toFixed(4));}
  catch(e){console.log((k*0.5).toFixed(1),'mm',e.message);}}
// is the face 10183 boundary 1 mm (the blend radius) from that continuation?
const pts=[c.end.p];for(let k=1;k<=140;k++){try{pts.push(F.corrector(S1,S2,G.add(c.end.p,G.mul(T,k*0.05e-3)),T,cache));}catch(e){}}
const dpoly=q=>{let best=Infinity;for(let i=1;i<pts.length;i++){const a=pts[i-1],d=G.sub(pts[i],a),s=Math.max(0,Math.min(1,G.dot(G.sub(q,a),d)/G.dot(d,d)));best=Math.min(best,G.dist(q,G.add(a,G.mul(d,s))));}return best;};
const face=[...M.faces.values()].find(f=>f.id===10183);
for(const l of face.loops)for(const co of l.coedges){const e=M.edges.get(co.edge);if(!e.v)continue;
  for(const v of e.v){const p=M.vertices.get(v).p;console.log('vertex',v,'dist to continuation',(dpoly(p)*1e3).toFixed(6),'mm');}}
