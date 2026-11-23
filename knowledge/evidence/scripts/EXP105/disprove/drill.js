// list off(>1e-7) vertices that are unshared (no equal coordinate in another display face) or not on the chord of their boundary neighbours
const L=require('./lib');const THR=1e-7;const ck=p=>p.join(',');
for(const file of process.argv.slice(2)){
 const {d,M,j}=L.load(file);console.log('##',file.replace(/.*\//,''));
 const all=[];d.faces.forEach((f,fi)=>{for(let i=0;i<f.vertexCount;i++)all.push({fi,p:L.V(f,i)});});
 const owner=new Map();all.forEach(a=>{const k=ck(a.p);if(!owner.has(k))owner.set(k,new Set());owner.get(k).add(a.fi);});
 d.faces.forEach((df,fi)=>{const nf=j[fi].face;if(!nf||!['cylinder','cone'].includes(nf.surface.type))return;const s=nf.surface;
  const adj=new Map(),pos=new Map();for(const e of df.edgeAnnotations)if(e.id!==0){const a=ck(L.V(df,e.vertices[0])),b=ck(L.V(df,e.vertices[1]));if(a===b)continue;pos.set(a,L.V(df,e.vertices[0]));pos.set(b,L.V(df,e.vertices[1]));(adj.get(a)||adj.set(a,new Set()).get(a)).add(b);(adj.get(b)||adj.set(b,new Set()).get(b)).add(a);}
  let shown=0;
  for(let i=0;i<df.vertexCount;i++){const p=L.V(df,i),r=Math.abs(L.dSurf(s,p));if(r<=THR)continue;const k=ck(p);
   const sh=[...owner.get(k)].some(x=>x!==fi);const nb=adj.get(k);let cd=NaN;if(nb&&nb.size===2){const [a,b]=[...nb];cd=L.segDist(p,pos.get(a),pos.get(b));}
   if(sh&&cd<=1e-7)continue;if(shown++>=4)continue;
   let near=Infinity;for(const a of all)if(a.fi!==fi)near=Math.min(near,L.len(L.sub(p,a.p)));
   // distance to nearest other off-surface or on-surface vertex in own face along boundary
   console.log(' face',fi,s.type,'rawId',df.metadata.rawId,'r',r.toExponential(2),'shared',sh,'nearestOtherFaceVertex',near.toExponential(2),'chordDist',cd.toExponential(2),'deg',nb?nb.size:0,'native',j[fi].how);}
  });}
