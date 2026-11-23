const L=require('./lib');
const {d,M,j}=L.load(process.argv[2]);
const fi=+process.argv[3];const df=d.faces[fi],s=j[fi].face.surface;
const ids=new Set();for(const e of df.edgeAnnotations)if(e.id===61){ids.add(e.vertices[0]);ids.add(e.vertices[1]);}
const rows=[...ids].map(i=>{const p=L.V(df,i);return {i,ang:Math.atan2(p[2],p[0]),r:L.dSurf(s,p),p};}).sort((a,b)=>a.ang-b.ang);
// dedupe by coordinate
const seen=new Set();const u=rows.filter(x=>{const k=x.p.join();if(seen.has(k))return false;seen.add(k);return true;});
console.log('unique circle verts',u.length);
u.forEach((x,k)=>{const prev=u[(k+u.length-1)%u.length],next=u[(k+1)%u.length];
 // distance to chord of neighbours
 const cd=L.segDist(x.p,prev.p,next.p);
 console.log(k,x.ang.toFixed(4),(x.r*1e6).toFixed(3)+'um','dAng',((next.ang-x.ang+2*Math.PI)%(2*Math.PI)).toFixed(4),'distToNbrChord',cd.toExponential(2));});
