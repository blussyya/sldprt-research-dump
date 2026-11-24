// EXP-117: why chainwheel's faces have no boundary cycles. Per face: degree of welded boundary
// nodes, and at odd nodes, the nearest other boundary node (gap) and whether triangles reach there.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs');
const d=S.parse(fs.readFileSync(process.argv[2]));const agg={faces:0,amb:0,deg:{},gaps:[],ctrl0:0,strips3:0,stripsAll:0};
d.faces.forEach((f,fi)=>{agg.faces++;agg.stripsAll+=f.stripLengths.length;agg.strips3+=f.stripLengths.filter(n=>n===3).length;agg.ctrl0+=(f.stripControls||[]).filter(c=>c===0).length;
  if(f.boundaryCycles)return;agg.amb++;
  const key=i=>[0,1,2].map(k=>f.vertices[3*i+k]).join(','),P=new Map(),deg=new Map();
  for(const e of f.edgeAnnotations)if(e.id!==0){const a=key(e.vertices[0]),b=key(e.vertices[1]);if(a===b)continue;
    for(const [x,i] of [[a,e.vertices[0]],[b,e.vertices[1]]]){deg.set(x,(deg.get(x)||0)+1);P.set(x,[0,1,2].map(k=>f.vertices[3*i+k]));}}
  const odd=[...deg].filter(([k,v])=>v%2);for(const [k,v] of deg)agg.deg[v]=(agg.deg[v]||0)+1;
  for(const [k] of odd){const p=P.get(k);let best=Infinity;for(const [k2] of odd)if(k2!==k){const q=P.get(k2);best=Math.min(best,Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]));}agg.gaps.push(best);}
});
agg.gaps.sort((a,b)=>a-b);const g=agg.gaps;
console.log(JSON.stringify({faces:agg.faces,noCycles:agg.amb,degreeHistogram:agg.deg,strips:agg.stripsAll,threeVertexStrips:agg.strips3,control0:agg.ctrl0,oddNodes:g.length,
 nearestOddGap:{min:g[0],median:g[g.length>>1],max:g[g.length-1],under1e6:g.filter(x=>x<1e-6).length,under1e9:g.filter(x=>x<1e-9).length}}));
