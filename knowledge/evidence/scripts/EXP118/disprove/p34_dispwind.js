// Winding of a display face's boundary cycles about a native cylinder's axis, per edge id run.
// The boundary of any finite piece of a cylinder winds 0 in total; a native loop set that doesn't
// sum to 0 can't bound a finite face. Used on f0b9a118 face 27 to tell a real defect from a sampling slip.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file=process.argv[2],fid=+process.argv[3],di=+process.argv[4];
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const s=M.faces.find(f=>f.id===fid).surface,y=G.cross(s.a,s.x),th=p=>{const q=G.sub(p,s.p);return Math.atan2(G.dot(q,y),G.dot(q,s.x))*180/Math.PI;};
const f=d.faces[di];let total=0;
for(const c of f.boundaryCycles){const ps=c.vertices.map(i=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);const per={};let t=0;
  for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];let x=th(b)-th(a);while(x>180)x-=360;while(x<-180)x+=360;t+=x;per[c.edgeIds[i]]=(per[c.edgeIds[i]]||0)+x;}
  total+=t;console.log('display',di,'cycle segs',ps.length,'winding',t.toFixed(2),'per id',JSON.stringify(Object.fromEntries(Object.entries(per).map(([k,v])=>[k,+v.toFixed(1)]))));}
console.log('total',total.toFixed(2));
