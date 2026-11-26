// EXP-121: where the vertices of the SP_CURVE edges on blend 15483 sit along its spine (global
// projection), their distance from the blend (|p - spine| - r), against the per-face fitted ranges.
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),node=+process.argv[3],ids=process.argv.slice(4).map(Number);
const b=M.faces.find(f=>f.surface.node===node).surface,sp=F.spineOf(b,1e-8).curve,r=Math.abs(b.range[0]),[lo,hi]=G.curveRange(sp);
console.log(`blend${node} r ${r}, spine range ${lo.toPrecision(6)}..${hi.toPrecision(6)}`);
for(const id of ids){const e=[...M.edges.values()].find(x=>x.displayId===id);
  for(const v of e.v){const p=M.vertices.get(v).p,pr=G.curveProject(sp,p),c=G.curvePoint(sp,pr.t),d=Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]);
    console.log(`  edge ${id} vertex ${v}: spine t ${pr.t.toPrecision(6)}, distance to spine ${(d*1e3).toFixed(4)} mm (minus r: ${(d-r).toExponential(2)} m)`);}}
