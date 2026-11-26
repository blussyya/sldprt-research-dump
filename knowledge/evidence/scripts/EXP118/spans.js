// EXP-118: around the bore of native face 2516, the angular span and heights of every display label
// 1093 and 1166 on every display face, and of the native edges themselves (circle 1166 from its own
// centre, normal and x axis; intersection 1093 from its chart points between its two vertices).
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),br=S.readBrep(buf),M=N.build(br.parsed);
const bore=M.faces.find(f=>f.id===2516).surface,A=bore.a,P0=bore.p;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const E=id=>[...M.edges.values()].find(e=>e.displayId===id),VP=id=>{const v=M.vertices.get?M.vertices.get(id):M.vertices[id];return v.p||v.point||v;};
const e66=E(1166),V1=VP(e66.v[0]),V2=VP(e66.v[1]);
let X=sub(V1,P0);X=sub(X,A.map(a=>a*dot(X,A)));const nx=Math.hypot(...X);X=X.map(x=>x/nx);const Y=crs(A,X);
const ang=p=>{const q=sub(p,P0);let t=Math.atan2(dot(q,Y),dot(q,X))*180/Math.PI;return t<-1e-6?t+360:t;},h=p=>dot(sub(p,P0),A)*1e3;
console.log(`V1 ${ang(V1).toFixed(1)} deg h ${h(V1).toFixed(3)} | V2 ${ang(V2).toFixed(1)} deg h ${h(V2).toFixed(3)} (angles about the bore axis, measured from V1)`);
// circle 1166: which way does it run from its start vertex?
const c=e66.curve;console.log('circle 1166 normal . bore axis',dot(c.n,A).toFixed(6),'edge sameSense',e66.sameSense);
const t0=Math.atan2(dot(sub(V1,c.c),crs(c.n,c.x)),dot(sub(V1,c.c),c.x)),t1=Math.atan2(dot(sub(V2,c.c),crs(c.n,c.x)),dot(sub(V2,c.c),c.x));
let span=(t1-t0)*180/Math.PI;if(span<0)span+=360;console.log(`circle 1166 from start to end vertex, counter-clockwise about its own normal: ${span.toFixed(1)} deg; the other way ${(360-span).toFixed(1)} deg`);
for(let k=1;k<4;k++){const t=t0+(e66.sameSense?1:-1)*k/4*span*Math.PI/180,p=[0,1,2].map(i=>c.c[i]+c.r*(Math.cos(t)*c.x[i]+Math.sin(t)*crs(c.n,c.x)[i]));console.log(`  point ${k}/4 along it: ${ang(p).toFixed(1)} deg, h ${h(p).toFixed(3)}`);}
// display labels
for(const id of [1093,1166,1165])d.faces.forEach((f,i)=>{const as=[],hs=[];for(const a of f.edgeAnnotations||[])if(a.id===id)for(const v of a.vertices){const p=[0,1,2].map(k=>f.vertices[3*v+k]);as.push(ang(p));hs.push(h(p));}
  if(as.length)console.log(`display face ${i} label ${id}: ${as.length/2} segments, angles ${Math.min(...as).toFixed(1)} to ${Math.max(...as).toFixed(1)}, heights ${Math.min(...hs).toFixed(3)} to ${Math.max(...hs).toFixed(3)}`);});
