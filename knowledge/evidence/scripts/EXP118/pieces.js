// EXP-118: the triangle pieces of a display face (connected through shared welded edges), and each
// piece's boundary loops: length, labelled or not, which Block1 ids, and distance to the native
// surface. usage: node pieces.js <part> <face index> [native face id]
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const [file,fiS,nfS]=process.argv.slice(2),buf=fs.readFileSync(file),d=S.parse(buf),f=d.faces[+fiS];
let surf=null;if(nfS){const M=N.build(S.readBrep(buf).parsed);surf=[...M.faces.values()].find(x=>x.id===+nfS).surface;}
const V=i=>[0,1,2].map(k=>f.vertices[3*i+k]),key=i=>V(i).join(','),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const T=[];for(let t=0;t<f.triangleIndices.length;t+=3)T.push([0,1,2].map(j=>f.triangleIndices[t+j]));
const byEdge=new Map();T.forEach((t,ti)=>{for(const [a,b] of [[0,1],[1,2],[0,2]]){const k=pk(key(t[a]),key(t[b]));if(!byEdge.has(k))byEdge.set(k,[]);byEdge.get(k).push(ti);}});
const lab=new Map();for(const e of f.edgeAnnotations)if(e.id)lab.set(pk(key(e.vertices[0]),key(e.vertices[1])),e.id);
const par=T.map((_,i)=>i),find=x=>{while(par[x]!==x)x=par[x]=par[par[x]];return x;};
for(const ts of byEdge.values())for(let i=1;i<ts.length;i++)par[find(ts[i])]=find(ts[0]);
const comps=new Map();T.forEach((_,ti)=>{const r=find(ti);if(!comps.has(r))comps.set(r,[]);comps.get(r).push(ti);});
const area=t=>{const [a,b,c]=t.map(V);return Math.hypot(...G.cross(G.sub(b,a),G.sub(c,a)))/2;};
const P=new Map();T.forEach(t=>t.forEach(i=>P.set(key(i),V(i))));
console.log('face',fiS,'triangles',T.length,'pieces',comps.size);
for(const [r,ts] of comps){
  const own=new Set(ts),bnd=[];for(const [k,tl] of byEdge){const mine=tl.filter(x=>own.has(x));if(mine.length===1&&tl.length===1)bnd.push(k);}
  // loops of the boundary graph (components)
  const adj=new Map();for(const k of bnd){const [a,b]=k.split('|');for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({y,k});}}
  const seen=new Set(),loops=[];for(const s of adj.keys()){if(seen.has(s))continue;const st=[s],segs=new Set();seen.add(s);while(st.length){const x=st.pop();for(const {y,k} of adj.get(x)){segs.add(k);if(!seen.has(y)){seen.add(y);st.push(y);}}}
    const ids={};let unl=0;for(const k of segs){const id=lab.get(k);if(id)ids[id]=(ids[id]||0)+1;else unl++;}
    let ds=0;if(surf)for(const k of segs)for(const p of k.split('|'))ds=Math.max(ds,Math.abs(G.surfaceDistance(surf,P.get(p)).d));
    loops.push(`${segs.size} segments: ids ${JSON.stringify(ids)}, unlabelled ${unl}${surf?', max off surface '+ds.toExponential(1):''}`);}
  let ds=0;if(surf)for(const ti of ts)for(const i of T[ti])ds=Math.max(ds,Math.abs(G.surfaceDistance(surf,V(i)).d));
  console.log(` piece: ${ts.length} triangles, area ${(ts.reduce((a,ti)=>a+area(T[ti]),0)*1e6).toFixed(4)} mm², vertices max ${ds.toExponential(1)} m off the native surface`);
  for(const l of loops)console.log('   loop',l);
}
