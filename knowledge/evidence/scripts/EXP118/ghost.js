// EXP-118: does another B-rep copy in the file (GhostPartition, other configurations, deltas) carry
// the ids the display labels use? For every section with faces in every GUID-bearing stream, the
// offset between display edge labels and that section's edge node_ids, matched by end vertices.
const R='/home/user/solidworks-converters',S=require(R+'/src'),P=require(R+'/src/parasolid/partition'),X=require(R+'/src/parasolid/xt'),N=require(R+'/src/brep/native'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),all=P.streams(buf);
const pts=new Map();d.faces.forEach(f=>{for(const a of f.edgeAnnotations||[])if(a.id){if(!pts.has(a.id))pts.set(a.id,[]);for(const v of a.vertices)pts.get(a.id).push([0,1,2].map(k=>f.vertices[3*v+k]));}});
const near=(P_,q)=>P_.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<1e-6);
console.log('streams:',Object.keys(all).filter(k=>/Partition|Bodies|Resolved/i.test(k)).join(', '));
for(const [name,b] of Object.entries(all)){const w=P.sections(b,0);if(!w.out.length)continue;
  w.out.forEach((s,i)=>{let M;try{const q=X.parse(s.body,true);if(q.error||!q.nodes||!q.nodes.some(n=>n.type===14))return;M=N.build(q);}catch(e){console.log(`${name} #${i} ${s.kind}: ${e.message}`);return;}
    const VP=id=>{const v=M.vertices.get(id);return v&&(v.p||v.point);};const byId=new Map();
    for(const e of M.edges.values()){if(!e.v||e.v[0]==null)continue;if(!byId.has(e.displayId))byId.set(e.displayId,[]);byId.get(e.displayId).push(e);}
    const h={};let none=0;for(const [lab,Q] of pts){const hits=[];for(let k=-40;k<=40;k++)for(const e of byId.get(lab-k)||[]){const a=VP(e.v[0]),c=VP(e.v[1]);if(a&&c&&near(Q,a)&&near(Q,c))hits.push(k);}
      if(hits.length===1)h[hits[0]]=(h[hits[0]]||0)+1;else if(!hits.length)none++;}
    console.log(`${name} section ${i} (${s.kind}): faces ${M.faces.length}, edges ${M.edges.size}; offset histogram ${JSON.stringify(h)}, labels with no match ${none}`);});}
