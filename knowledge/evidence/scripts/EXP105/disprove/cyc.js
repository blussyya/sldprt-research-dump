// walk the boundary cycle of one display face in order; print residual and chord distance to cycle neighbours
const L=require('./lib');const ck=p=>p.join(',');
const [file,fi0]=[process.argv[2],+process.argv[3]];const {d,M,j}=L.load(file);
const df=d.faces[fi0],s=j[fi0].face.surface;console.log(JSON.stringify({type:s.type,r:s.r,p:s.p,a:s.a,angle:s.angle}));
const adj=new Map(),pos=new Map(),id=new Map();for(const e of df.edgeAnnotations)if(e.id!==0){const a=ck(L.V(df,e.vertices[0])),b=ck(L.V(df,e.vertices[1]));if(a===b)continue;pos.set(a,L.V(df,e.vertices[0]));pos.set(b,L.V(df,e.vertices[1]));id.set(a,e.id);id.set(b,e.id);(adj.get(a)||adj.set(a,new Set()).get(a)).add(b);(adj.get(b)||adj.set(b,new Set()).get(b)).add(a);}
const seen=new Set();let n=0;
for(const st of adj.keys()){if(seen.has(st))continue;console.log('--cycle');let prev=null,cur=st;const cyc=[];
 do{seen.add(cur);cyc.push(cur);const nx=[...adj.get(cur)].find(x=>x!==prev)||[...adj.get(cur)][0];prev=cur;cur=nx;}while(cur!==st&&cyc.length<5000);
 cyc.forEach((k,i)=>{const a=pos.get(cyc[(i+cyc.length-1)%cyc.length]),b=pos.get(cyc[(i+1)%cyc.length]),p=pos.get(k);
  const q=L.sub(p,s.p),h=L.dot(q,s.a);
  if(n++<400)console.log(i,'edge',id.get(k),'r',(L.dSurf(s,p)*1e6).toFixed(3)+'um','h',h.toFixed(6),'chord',L.segDist(p,a,b).toExponential(1));});}
