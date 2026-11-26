// Strip and vertex order check: each strip triangle's geometric normal against the mean of its three
// stored vertex normals. A wrong strip/vertex reading gives flipped or garbage triangles.
// Faces 75 and 448 against the rest of the file as the control.
const L=require('./lib'),S=require(L.R+'/src'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const d=S.parse(fs.readFileSync(file));
const V=(f,i)=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]],Nn=(f,i)=>[f.normals[3*i],f.normals[3*i+1],f.normals[3*i+2]];
let all={t:0,bad:0,deg:0};const per={};
d.faces.forEach((f,fi)=>{const {tris}=L.rebuild(f);let t=0,bad=0,deg=0;
  for(const [a,b,c] of tris){const n=G.cross(G.sub(V(f,b),V(f,a)),G.sub(V(f,c),V(f,a)));if(G.norm(n)<1e-18){deg++;continue;}const m=G.add(G.add(Nn(f,a),Nn(f,b)),Nn(f,c));t++;if(G.dot(n,m)<=0)bad++;}
  all.t+=t;all.bad+=bad;all.deg+=deg;if(fi===75||fi===448)per[fi]={t,bad,deg};});
console.log('file triangles',JSON.stringify(all),'faces 75/448',JSON.stringify(per));
