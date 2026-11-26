// EXP-118: the unlabelled holes in f666f342 faces 75 and 448. For each display face with a closed
// chain of mesh-boundary edges (one triangle, welded by exact coordinates) that all carry Block1 id 0:
// the chain's size and centre, the native face it joins (by edge-id set), that face's loops, whether
// other display faces have triangles over the hole, and what the reader rejected or set aside.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const key=(f,i)=>[0,1,2].map(k=>f.vertices[3*i+k]).join(','),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const holes=[];
d.faces.forEach((f,fi)=>{
  if(!f.edgeAnnotations)return;
  const use=new Map(),pos=new Map();
  for(let t=0;t<f.triangleIndices.length;t+=3){const ix=[0,1,2].map(j=>f.triangleIndices[t+j]),k=ix.map(i=>key(f,i));ix.forEach((i,j)=>pos.set(k[j],[0,1,2].map(c=>f.vertices[3*i+c])));
    for(const [a,b] of [[0,1],[1,2],[0,2]])if(k[a]!==k[b])use.set(pk(k[a],k[b]),(use.get(pk(k[a],k[b]))||0)+1);}
  const labelled=new Set();for(const e of f.edgeAnnotations)if(e.id!==0)labelled.add(pk(key(f,e.vertices[0]),key(f,e.vertices[1])));
  const open=[...use].filter(([k,n])=>n===1&&!labelled.has(k)).map(([k])=>k.split('|'));
  if(!open.length)return;
  // components
  const adj=new Map();for(const [a,b] of open){for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
  const seen=new Set();
  for(const s of adj.keys()){if(seen.has(s))continue;const comp=[];const st=[s];seen.add(s);while(st.length){const x=st.pop();comp.push(x);for(const y of adj.get(x))if(!seen.has(y)){seen.add(y);st.push(y);}}
    const P=comp.map(k=>pos.get(k)),c=[0,1,2].map(k=>P.reduce((a,p)=>a+p[k],0)/P.length),r=Math.max(...P.map(p=>G.dist(p,c)));
    const closed=comp.every(k=>adj.get(k).length===2);
    holes.push({fi,vertices:comp.length,closed,centre:c,radius:r,keys:comp});}
});
console.log('faces',d.faces.length,'| rejected records',(d.rejected||[]).length,'| overlays',(d.overlays||[]).length,'| warnings',d.warnings.length);
for(const w of d.warnings.slice(0,5))console.log('  warning',JSON.stringify(w).slice(0,140));
for(const h of holes){
  const f=d.faces[h.fi],ids=new Set(f.edgeAnnotations.filter(e=>e.id).map(e=>e.id));
  const cands=[...M.faces.values()].filter(nf=>{const s=new Set();for(const l of nf.loops)for(const ce of l.coedges){const e=M.edges.get(ce.edge);s.add(e.displayId!==undefined?e.displayId:e.id);}return s.size===ids.size&&[...ids].every(x=>s.has(x));});
  const nf=cands[0];
  // other display faces with a vertex on the hole chain
  const hk=new Set(h.keys),covers=new Map();
  d.faces.forEach((g,gi)=>{if(gi===h.fi)return;let n=0;for(let i=0;i<g.vertexCount;i++)if(hk.has(key(g,i)))n++;if(n)covers.set(gi,n);});
  // native: distance of the hole centre to the face's surface, and the loops
  let dsurf=null;try{dsurf=Math.abs(G.surfaceDistance(nf.surface,h.centre).d);}catch(e){}
  console.log(`display face ${h.fi}: ${h.closed?'closed':'open'} chain of ${h.vertices} vertices, centre [${h.centre.map(x=>x.toFixed(5))}] m, radius ${(h.radius*1000).toFixed(3)} mm`);
  console.log(`   native join by edge set: ${cands.length} candidate(s)`+(nf?`; face ${nf.id}, ${nf.surface.type}, ${nf.loops.length} loop(s) of ${nf.loops.map(l=>l.coedges.length).join('+')} edges; hole centre ${dsurf===null?'?':dsurf.toExponential(2)} m from its surface`:''));
  console.log(`   other display faces with a vertex on the hole chain: ${covers.size?[...covers].map(([g,n])=>g+' ('+n+' of '+d.faces[g].vertexCount+' vertices)').join(', '):'none'}`);
}
fs.writeFileSync(process.argv[3],JSON.stringify(holes.map(h=>({fi:h.fi,keys:h.keys}))));
