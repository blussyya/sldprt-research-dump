// EXP-118: the display/native edge id offset in f666f342. For every display edge label, find the native
// edges with an analytic curve (line, circle, ellipse) whose display id is within +-12 of the label and
// on whose curve every segment vertex of that label lies (1e-7 m). Report label - native id, by native id.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),br=S.readBrep(buf),M=N.build(br.parsed);
const edges=[...M.edges.values()].filter(e=>e.curve&&['line','circle','ellipse'].includes(e.curve.type));
const src={sec:0,node:0};for(const e of br.parsed.entities||[])if(e.type==='EDGE'||e.typeName==='EDGE'){e.values.section_node_id!==undefined?src.sec++:src.node++;}
const byId=new Map();for(const e of edges){if(!byId.has(e.displayId))byId.set(e.displayId,[]);byId.get(e.displayId).push(e);}
const pts=new Map();// label -> vertices
d.faces.forEach(f=>{for(const a of f.edgeAnnotations||[])if(a.id){if(!pts.has(a.id))pts.set(a.id,[]);for(const v of a.vertices)pts.get(a.id).push([0,1,2].map(k=>f.vertices[3*v+k]));}});
const rows=[];
for(const [lab,P] of pts){const hits=[];for(let k=-12;k<=12;k++)for(const e of byId.get(lab-k)||[]){let w=0;for(const p of P){w=Math.max(w,G.curveProject(e.curve,p).d);if(w>1e-7)break;}if(w<=1e-7)hits.push(k);}
  rows.push({lab,hits});}
const uniq=rows.filter(r=>r.hits.length===1).sort((a,b)=>a.lab-b.lab);
const hist={};for(const r of uniq)hist[r.hits[0]]=(hist[r.hits[0]]||0)+1;
console.log('labels',rows.length,'with one analytic match',uniq.length,'ambiguous',rows.filter(r=>r.hits.length>1).length,'none',rows.filter(r=>!r.hits.length).length);
console.log('offset (label - native id) histogram',JSON.stringify(hist));
// where does the offset change, walking labels in order
let prev=null;for(const r of uniq){if(r.hits[0]!==prev){console.log(`  from label ${r.lab}: offset ${r.hits[0]}`);prev=r.hits[0];}}
fs.writeFileSync(__dirname+'/offset.json',JSON.stringify(rows));
