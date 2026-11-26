// How tight is "lies on the intersection curve" for edge 1093? Per display vertex labelled 1093
// (face 75 and face 56): distance to the chart polyline, radial distance to the bore cylinder, and
// the chart's own stored chordal error. A point exactly on the curve can sit up to about the chordal
// error off the polyline. Control: chart nodes themselves are on the cylinder at ~0.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const e=M.edges.get(1093),c=e.curve,cyl=M.faces.find(f=>f.id===2516).surface;
const dr=p=>{const q=G.sub(p,cyl.p),h=G.dot(q,cyl.a);return G.norm(G.sub(q,G.mul(cyl.a,h)))-cyl.r;};
console.log('chordal error stored',c.chordalError,'chart nodes radial max',Math.max(...c.chart.map(x=>Math.abs(dr(x.slice(0,3))))).toExponential(2));
const br=B.branch(M,e,false);
for(const di of [75,56]){const f=d.faces[di];const {E}=L.meshEdges(f);
  const pts=[...new Set([...E].filter(([p,x])=>x.uses===1&&x.ids.includes(1093)).flatMap(([p])=>p.split('|')))].map(L.P);
  const rows=pts.map(p=>({dc:B.polyDist(br,p),dr:dr(p)}));
  console.log('display',di,'pts',pts.length,'to chart: max',Math.max(...rows.map(r=>r.dc)).toExponential(2),'median',rows.map(r=>r.dc).sort((a,b)=>a-b)[rows.length>>1].toExponential(2),'| radial: max |dr|',Math.max(...rows.map(r=>Math.abs(r.dr))).toExponential(2),'n |dr|<1e-7',rows.filter(r=>Math.abs(r.dr)<1e-7).length);
  // on-surface subset
  const on=rows.filter(r=>Math.abs(r.dr)<1e-7);console.log('   on-cylinder subset: to chart max',on.length?Math.max(...on.map(r=>r.dc)).toExponential(2):'-');}
