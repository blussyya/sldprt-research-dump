// EXP-121: head_face's SP_CURVE edges over 1e-8 m. For each: the surface its 2D curve lies on, the
// 2D curve's (u,v) spans (re-anchoring needs one of them under 1e-3), the vertex tolerances, and how
// far the raw curve's ends land from the vertices on the raw surface where that can be evaluated.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed);
const d=s=>s.type+(s.node||'')+(s.type==='blend'?'[r '+JSON.stringify(s.range)+' '+s.surfaces.map(q=>q.type+(q.node||'')).join(',')+']':'')+(s.type==='offset'?'(d '+s.d+' of '+s.basis.type+(s.basis.node||'')+')':'');
for(const id of process.argv.slice(3).map(Number)){const e=[...M.edges.values()].find(x=>x.displayId===id);let c=e.curve;const tr=c.type==='trimmed';if(tr)c=c.basis;
  const [a,z]=G.curveRange(c.c2),us=[],vs=[];for(let i=0;i<=48;i++){const q=G.curvePoint(c.c2,a+(z-a)*i/48);us.push(q[0]);vs.push(q[1]);}
  const faces=M.faces.filter(f=>f.loops.some(l=>l.coedges.some(co=>co.edge===e.id))).map(f=>f.id+':'+f.surface.type);
  const V=e.v?e.v.map(v=>M.vertices.get(v)):[];
  console.log(`edge ${id}${tr?' (trimmed)':''}: on ${d(c.surface)}; faces ${faces.join(' ')}; 2D u ${Math.min(...us).toPrecision(6)}..${Math.max(...us).toPrecision(6)} v ${Math.min(...vs).toPrecision(6)}..${Math.max(...vs).toPrecision(6)}; vertex tolerances ${V.map(v=>(v.tolerance||0).toExponential(1)).join(' ')}; edge tolerance ${(e.tolerance||0).toExponential(1)}; ends ${V.length?(Math.hypot(...V[0].p.map((x,k)=>x-V[1].p[k]))*1e3).toFixed(3)+' mm apart':'closed'}`);}
