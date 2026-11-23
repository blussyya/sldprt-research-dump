// EXP-105: distance of display-mesh vertices to the joined native cylinder/cone, closed form.
// usage: node measure.js <part.SLDPRT> [verbose]
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2];
const d=S.parse(f0),b=S.readBrep(f0),nat=N.build(b.parsed);
const byId=new Map(nat.faces.map(f=>[f.id,f]));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const nrm=a=>Math.hypot(a[0],a[1],a[2]);
// distance to infinite cylinder (radius r) and cone (radius r at p, half angle a, axis a)
function cyl(s,p){const q=sub(p,s.p),h=dot(q,s.a);const rad=nrm([q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h]);return Math.abs(rad-s.r);}
function cone(s,p){const q=sub(p,s.p),h=dot(q,s.a);const rad=nrm([q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h]);
  // perpendicular distance to the generator line in the (rad,h) half plane
  const ca=Math.cos(s.angle),sa=Math.sin(s.angle);return Math.abs((rad-s.r)*ca-h*sa);}
const out=[];
for(const f of d.faces){const m=f.metadata;if(!m||(m.typeTag!==4002&&m.typeTag!==4003))continue;
  const nf=byId.get(m.rawId);if(!nf){out.push({id:m.rawId,tag:m.typeTag,missing:1});continue;}
  const s=nf.surface;if(s.type!==(m.typeTag===4002?'cylinder':'cone')){out.push({id:m.rawId,tag:m.typeTag,mismatch:s.type});continue;}
  const v=f.vertices,n=f.vertexCount||v.length/3;let sum=0,max=0;
  for(let i=0;i<n;i++){const p=[v[3*i],v[3*i+1],v[3*i+2]];const e=(s.type==='cylinder'?cyl:cone)(s,p);sum+=e;if(e>max)max=e;}
  // triangle-midpoint distance (chordal test) and distance of vertices to edge midpoints
  const t=f.triangleIndices;let msum=0,mmax=0,mn=0;
  if(t)for(let i=0;i<t.length;i+=3){const P=[0,1,2].map(k=>[v[3*t[i+k]],v[3*t[i+k]+1],v[3*t[i+k]+2]]);
    const c=[0,1,2].map(k=>(P[0][k]+P[1][k]+P[2][k])/3);const e=(s.type==='cylinder'?cyl:cone)(s,c);msum+=e;mmax=Math.max(mmax,e);mn++;}
  out.push({id:m.rawId,tag:m.typeTag,type:s.type,r:s.r,angle:s.angle,n,mean:sum/n,max,rel:sum/n/s.r,relmax:max/s.r,sameAsR:0,cenMean:mn?msum/mn:null,cenMax:mmax});
}
console.log(JSON.stringify({file:f0,faces:out},null,0));
