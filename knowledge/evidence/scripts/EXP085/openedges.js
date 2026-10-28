// where a triangulation's open edges are: endpoints, and the faces that use them
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),N=require(D+'brep/native'),P=require(D+'brep/procedural'),Sp=require(D+'brep/split'),T=require(D+'brep/tessellate');
const [f,tol]=process.argv.slice(2);const M=Sp.split(P.resolve(N.build(I.readBrep(f).parsed)));
const t=T.tessellate(M,{tolerance:+tol});const dir=new Map();
t.faces.forEach((F,fi)=>{for(const [a,b,c] of F.triangles)for(const [p,q] of [[a,b],[b,c],[c,a]]){const kk=p+','+q;(dir.get(kk)||dir.set(kk,[]).get(kk)).push(fi);}});
let n=0;const near=new Map();
for(const [kk,fs] of dir){const [p,q]=kk.split(',');if(dir.has(q+','+p)&&dir.get(q+','+p).length===fs.length)continue;n++;
  if(n<=12){const A=t.vertices[+p],B=t.vertices[+q];console.log(kk,'faces',fs.map(i=>t.faces[i].id+':'+M.faces[i].surface.type).join(','),A.map(x=>(x*1e3).toFixed(5)).join(','),'->',B.map(x=>(x*1e3).toFixed(5)).join(','));}}
// vertices closer than 1e-9 m to each other but distinct
const V=t.vertices;let dup=0;const g=new Map();V.forEach((p,i)=>{const k=p.map(x=>Math.round(x*1e8)).join(',');(g.get(k)||g.set(k,[]).get(k)).push(i);});for(const v of g.values())if(v.length>1)dup++;
console.log('open',n,'near-duplicate vertex groups',dup,'faces',M.faces.map(F=>F.surface.type).join(','));
