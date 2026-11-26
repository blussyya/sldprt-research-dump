// EXP-121: for each vertex of an SP_CURVE edge on a blend, its distance to the section's contact with
// support 0 and with support 1 (the fitted surface's v = 0 and v = 1 rows), and the edge's 2D v.
const R=process.env.CONV,S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),ids=process.argv.slice(3).map(Number);
const dd=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
for(const id of ids){const e=[...M.edges.values()].find(x=>x.displayId===id);let c=e.curve;if(c.type==='trimmed')c=c.basis;const b=c.surface,sp=F.spineOf(b,1e-8).curve;
  const [a,z]=G.curveRange(c.c2),v2=G.curvePoint(c.c2,(a+z)/2)[1];
  const chord=(()=>{const t=G.curveProject(sp,M.vertices.get(e.v[0]).p).t,cc=G.curvePoint(sp,t);return dd(F.contact(b,0,cc,new Map()),F.contact(b,1,cc,new Map()));})();
  const rows=e.v.map(v=>{const p=M.vertices.get(v).p,t=G.curveProject(sp,p).t,cc=G.curvePoint(sp,t);return `vertex ${v}: to support-0 contact ${dd(p,F.contact(b,0,cc,new Map())).toExponential(2)} m, to support-1 contact ${dd(p,F.contact(b,1,cc,new Map())).toExponential(2)} m`;});
  console.log(`edge ${id} on blend${b.node} (supports ${b.surfaces.map(s=>s.type+(s.node||'')).join(', ')}), 2D v ${v2.toPrecision(4)}, section chord ${chord.toExponential(3)} m\n  ${rows.join('\n  ')}`);}
