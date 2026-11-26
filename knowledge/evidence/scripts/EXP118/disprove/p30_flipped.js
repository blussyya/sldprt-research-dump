// The triangles whose winding disagrees with their stored normals: which faces, how big, and (for
// faces 75 and 448) where on the bore and whether they touch the unlabelled chain.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const V=(f,i)=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]],Nn=(f,i)=>[f.normals[3*i],f.normals[3*i+1],f.normals[3*i+2]];
const cylOf={75:M.faces.find(f=>f.id===2516).surface,448:M.faces.find(f=>f.id===12990).surface};
d.faces.forEach((f,fi)=>{const {tris,labels}=L.rebuild(f);const {E}=L.meshEdges(f);const key=i=>L.vkey(f,i);
  const unlV=new Set([...E].filter(([p,e])=>e.uses===1&&e.ids.every(x=>!x)).flatMap(([p])=>p.split('|')));
  for(const [a,b,c,s] of tris){const n=G.cross(G.sub(V(f,b),V(f,a)),G.sub(V(f,c),V(f,a)));const m=G.add(G.add(Nn(f,a),Nn(f,b)),Nn(f,c));if(G.dot(n,m)>0)continue;
    const area=G.norm(n)/2,cosang=G.dot(G.unit(n),G.unit(m));let where='';
    const cyl=cylOf[fi];if(cyl){const y=G.cross(cyl.a,cyl.x);where=[a,b,c].map(i=>{const q=G.sub(V(f,i),cyl.p);return (Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI).toFixed(1)+'/'+(G.dot(q,cyl.a)*1000).toFixed(3)+(unlV.has(key(i))?'*':'');}).join(' ');}
    console.log('face',fi,'strip',s,'area mm2',(area*1e6).toExponential(2),'cos(normal, stored)',cosang.toFixed(3),where);}});
