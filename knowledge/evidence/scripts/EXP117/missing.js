// EXP-117: on faces without cycles, mesh-boundary edges (one triangle, welded by coordinates) that
// carry Block1 id 0, and whether they connect a dead end (degree 1) to a T (degree 3).
// Also where they sit in their strip: strip control, strip length, edge position.
const S=require('/home/user/solidworks-converters/src'),fs=require('fs');
const d=S.parse(fs.readFileSync(process.argv[2]));const agg={faces:0,boundaryId0:0,joinsDeadEndToT:0,where:{},deadEnds:0,deadEndsExplained:0,ctrl:{}};
d.faces.forEach(f=>{if(f.boundaryCycles)return;agg.faces++;
  const key=i=>[0,1,2].map(k=>f.vertices[3*i+k]).join(','),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  const use=new Map();for(let t=0;t<f.triangleIndices.length;t+=3){const k=[0,1,2].map(j=>key(f.triangleIndices[t+j]));for(const [a,b] of [[k[0],k[1]],[k[1],k[2]],[k[0],k[2]]])if(a!==b)use.set(pk(a,b),(use.get(pk(a,b))||0)+1);}
  const deg=new Map();for(const e of f.edgeAnnotations)if(e.id!==0){const a=key(e.vertices[0]),b=key(e.vertices[1]);if(a===b)continue;deg.set(a,(deg.get(a)||0)+1);deg.set(b,(deg.get(b)||0)+1);}
  const dead=new Set([...deg].filter(([k,v])=>v===1).map(([k])=>k));agg.deadEnds+=dead.size;const explained=new Set();
  // strip position of each annotation
  let start=0;const stripOf=[];f.stripLengths.forEach((n,s)=>{for(let i=0;i<n;i++)stripOf[start+i]=s;start+=n;});
  const seen=new Set();
  for(const e of f.edgeAnnotations){if(e.id!==0)continue;const a=key(e.vertices[0]),b=key(e.vertices[1]),k=pk(a,b);if(a===b||seen.has(k))continue;seen.add(k);
    if(use.get(k)!==1)continue;agg.boundaryId0++;
    const da=deg.get(a)||0,db=deg.get(b)||0;if((da===1&&db===3)||(da===3&&db===1)){agg.joinsDeadEndToT++;explained.add(da===1?a:b);}
    const s=stripOf[e.vertices[0]],n=f.stripLengths[s],c=f.stripControls?f.stripControls[s]:'?';
    const pos=Math.min(e.vertices[0],e.vertices[1])===start?'':'';const w=`control ${c}, strip of ${n}`;agg.where[w]=(agg.where[w]||0)+1;}
  agg.deadEndsExplained+=explained.size;});
console.log(JSON.stringify(agg));
