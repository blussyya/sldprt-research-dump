// EXP-118: the offset measured with edge end points, which works for every curve type. For each
// display label, the native edges with id label - k (k in -12..12) whose two end vertices both lie on
// the label's segments (1e-6 m). Closed edges (no vertex) are skipped. f666f342's face records use the
// legacy metadata grammar, so display faces carry no id and only edges can be compared.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const VP=id=>{const v=M.vertices.get?M.vertices.get(id):M.vertices[id];return v&&(v.p||v.point||v.position||v);};
const byId=new Map();for(const e of M.edges.values()){if(!e.v||e.v[0]==null)continue;if(!byId.has(e.displayId))byId.set(e.displayId,[]);byId.get(e.displayId).push(e);}
const pts=new Map();d.faces.forEach(f=>{for(const a of f.edgeAnnotations||[])if(a.id){if(!pts.has(a.id))pts.set(a.id,[]);for(const v of a.vertices)pts.get(a.id).push([0,1,2].map(k=>f.vertices[3*v+k]));}});
const near=(P,q)=>P.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<1e-6);
const rows=[];for(const [lab,P] of pts){const hits=[];for(let k=-12;k<=12;k++)for(const e of byId.get(lab-k)||[]){const a=VP(e.v[0]),b=VP(e.v[1]);if(a&&b&&near(P,a)&&near(P,b))hits.push(k);}rows.push({lab,hits});}
const u=rows.filter(r=>r.hits.length===1).sort((a,b)=>a.lab-b.lab),h={};for(const r of u)h[r.hits[0]]=(h[r.hits[0]]||0)+1;
console.log('labels',rows.length,'one match',u.length,'several',rows.filter(r=>r.hits.length>1).length,'none',rows.filter(r=>!r.hits.length).length);
console.log('offset (label - native id):',JSON.stringify(h));
let p=null,last=null;for(const r of u){if(r.hits[0]!==p){console.log(`  label ${r.lab}: offset ${r.hits[0]}`+(last?` (previous label ${last})`:''));p=r.hits[0];}last=r.lab;}
fs.writeFileSync(__dirname+'/offset_ends-'+require('path').basename(process.argv[2]).slice(0,8)+'.json',JSON.stringify(rows));
