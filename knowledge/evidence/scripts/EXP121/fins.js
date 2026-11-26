// EXP-121: fit an SP_CURVE edge on a blend from its other fin, an SP_CURVE on an exactly evaluable
// surface (not a blend), and report that fit's error next to the vertex gaps. CONV picks the converter.
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),base=k=>k.type==='trimmed'?k.basis:k;
const isBlend=s=>s.type==='blend'||s.type==='blendBound'||(s.type==='offset'&&isBlend(s.basis));
for(const id of process.argv.slice(3).map(Number)){const e=[...M.edges.values()].find(x=>x.displayId===id);
  const fins=(e.pcurves||[]).map(pc=>({face:pc.face,c:base(pc.curve)})).filter(x=>x.c.type==='spcurve'&&!isBlend(x.c.surface));
  if(!fins.length){console.log(`edge ${id}: no fin on an exact surface (${(e.pcurves||[]).map(pc=>base(pc.curve).surface.type).join(', ')})`);continue;}
  for(const fin of fins){const p=e.v.map(v=>M.vertices.get(v).p);
    try{const r=F.edgeCurve(e,fin.c,p[0],p[1],{tolerance:1e-8,vertexTolerance:e.v.map(v=>M.vertices.get(v).tolerance||0)});
      // the fin curve's ends against the vertices, and against the edge's tolerance
      const a=G.curvePoint(r.curve,r.t0),b=G.curvePoint(r.curve,r.t1),gap=Math.max(Math.hypot(...a.map((x,k)=>x-p[0][k])),Math.hypot(...b.map((x,k)=>x-p[1][k])));
      console.log(`edge ${id}: from the fin on face ${fin.face} (${fin.c.surface.type}${fin.c.surface.node||''}): fit error ${r.error.toExponential(2)}, end-to-vertex ${gap.toExponential(2)} m, edge tolerance ${(e.tolerance||0).toExponential(1)}`);}
    catch(err){console.log(`edge ${id}: fin on face ${fin.face}: ${err.message}`);}}}
