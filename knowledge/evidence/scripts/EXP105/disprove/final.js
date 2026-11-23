// off = |r|>1e-7 on cyl/cone faces. For each: shared (exact coord, or within 1e-6 of another face's vertex), on chord of boundary neighbours (<=1e-7)
const L=require('./lib');const ck=p=>p.join(',');const THR=1e-7;
for(const file of process.argv.slice(2)){
 const {d,M,j}=L.load(file);const all=[];d.faces.forEach((f,fi)=>{for(let i=0;i<f.vertexCount;i++)all.push({fi,p:L.V(f,i)});});
 // grid for near-neighbour
 const G=new Map(),cell=1e-5;const gk=p=>p.map(x=>Math.floor(x/cell));
 all.forEach(a=>{const k=gk(a.p).join();(G.get(k)||G.set(k,[]).get(k)).push(a);});
 const near=(p,fi)=>{let m=Infinity;const g=gk(p);for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const l=G.get([g[0]+x,g[1]+y,g[2]+z].join());if(l)for(const a of l)if(a.fi!==fi)m=Math.min(m,L.len(L.sub(p,a.p)));}return m;};
 const R={file:file.replace(/.*\//,''),off:0,interior:0,exactShared:0,nearShared1e6:0,unsharedFar:0,onChord:0,notChord:0,notChordMaxR:0,notChordMinR:Infinity,unsharedFarMaxR:0};
 const farEx=[];
 d.faces.forEach((df,fi)=>{const nf=j[fi].face;if(!nf||!['cylinder','cone'].includes(nf.surface.type))return;const s=nf.surface;
  const adj=new Map(),pos=new Map();for(const e of df.edgeAnnotations)if(e.id!==0){const a=ck(L.V(df,e.vertices[0])),b=ck(L.V(df,e.vertices[1]));if(a===b)continue;pos.set(a,L.V(df,e.vertices[0]));pos.set(b,L.V(df,e.vertices[1]));(adj.get(a)||adj.set(a,new Set()).get(a)).add(b);(adj.get(b)||adj.set(b,new Set()).get(b)).add(a);}
  for(let i=0;i<df.vertexCount;i++){const p=L.V(df,i),r=Math.abs(L.dSurf(s,p));if(r<=THR)continue;R.off++;const k=ck(p);
   if(!adj.has(k))R.interior++;
   const n=near(p,fi);if(n===0)R.exactShared++;if(n<=1e-6)R.nearShared1e6++;else{R.unsharedFar++;R.unsharedFarMaxR=Math.max(R.unsharedFarMaxR,r);if(farEx.length<3)farEx.push({fi,rawId:df.metadata.rawId,r,nearest:n,how:j[fi].how});}
   const nb=adj.get(k);let cd=Infinity;if(nb&&nb.size===2){const [a,b]=[...nb];cd=L.segDist(p,pos.get(a),pos.get(b));}
   if(cd<=1e-7)R.onChord++;else{R.notChord++;R.notChordMaxR=Math.max(R.notChordMaxR,r);R.notChordMinR=Math.min(R.notChordMinR,r);}}});
 console.log(JSON.stringify(R));console.log('  unshared examples',JSON.stringify(farEx));}
