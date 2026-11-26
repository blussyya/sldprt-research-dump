// EXP-122 (NQ-067): an SP_CURVE edge whose vertex is far off its curve. For the edge: its curve and
// each fin, the 3D points at their ends and how far each is from each vertex. For each vertex: its
// tolerance, its distance from the surface of every face around it, and how far every other edge's
// curve there passes from it. CONV picks the converter.
// usage: node far.js <part> <edge id>...
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed),E=[...M.edges.values()];
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),x=v=>v.toExponential(2),base=k=>k.type==='trimmed'?k.basis:k;
const desc=s=>s.type+(s.node||'')+(s.type==='offset'?`(d ${s.d} of ${desc(s.basis)})`:'');
function surfDist(s,p){try{const r=G.surfaceInverse(s,p);return d(G.surfaceEval(s,r.u,r.v).p,p);}catch(e){return NaN;}}
function ends(c){const [a,b]=G.curveRange(c);return [G.curvePoint(c,a),G.curvePoint(c,b)];}
const facesOfEdge=new Map();for(const f of M.faces)for(const l of f.loops)for(const co of l.coedges){if(!facesOfEdge.has(co.edge))facesOfEdge.set(co.edge,[]);facesOfEdge.get(co.edge).push(f);}
for(const id of process.argv.slice(3).map(Number)){const e=M.edges.get(id)||E.find(q=>q.displayId===id);
  const V=e.v.map(v=>M.vertices.get(v));
  console.log(`edge ${e.id} (display ${e.displayId}): curve ${e.curve.type}${e.curve.type==='trimmed'?` of ${base(e.curve).type} t ${e.curve.t0}..${e.curve.t1}`:''}, tolerance ${x(e.tolerance||0)}, tolerant ${!!e.tolerant}`);
  console.log(`  faces ${(facesOfEdge.get(e.id)||[]).map(f=>f.id+' '+desc(f.surface)).join('; ')}`);
  V.forEach((v,i)=>console.log(`  vertex ${i} ${e.v[i]}: [${v.p.map(q=>q.toFixed(7)).join(', ')}], tolerance ${x(v.tolerance||0)}`));
  const curves=[['edge curve',e.curve],...(e.pcurves||[]).map(pc=>[`fin on face ${pc.face}`,pc.curve])];
  for(const [name,c] of curves){try{const [a,b]=c.type==='trimmed'?[G.curvePoint(c.basis,c.t0),G.curvePoint(c.basis,c.t1)]:ends(c),bc=base(c);
    console.log(`  ${name} (${bc.type}${bc.surface?' on '+desc(bc.surface):''}): start to v0 ${x(d(a,V[0].p))} v1 ${x(d(a,V[1].p))}; end to v0 ${x(d(b,V[0].p))} v1 ${x(d(b,V[1].p))}; nearest to v0 ${x(G.curveProject(c,V[0].p).d)}, v1 ${x(G.curveProject(c,V[1].p).d)}`);
    if(bc.type==='spcurve'){const [t0,t1]=G.curveRange(bc),q0=G.bsplineCurve?null:null;}}
    catch(err){console.log(`  ${name}: ${err.message}`);}}
  V.forEach((v,i)=>{const at=E.filter(q=>q.v&&q.v.includes(e.v[i]));
    const faces=[...new Set(at.flatMap(q=>facesOfEdge.get(q.id)||[]))];
    console.log(`  vertex ${i}: ${at.length} edges, ${faces.length} faces`);
    for(const f of faces)console.log(`    face ${f.id} ${desc(f.surface)}: vertex ${x(surfDist(f.surface,v.p))} off`);
    for(const q of at){if(q===e)continue;let s='';try{s=q.curve?x(G.curveProject(q.curve,v.p).d):'no curve';}catch(err){s=err.message;}
      console.log(`    edge ${q.id} ${q.curve?base(q.curve).type:'-'}${q.curve&&base(q.curve).surface?' on '+desc(base(q.curve).surface):''}: curve passes ${s} from it, tolerance ${x(q.tolerance||0)}`);}});}
