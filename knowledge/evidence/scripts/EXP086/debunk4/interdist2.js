const R=process.argv[2], file=process.argv[3];
const S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval'), F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(file).parsed);
const {add,mul,dot,norm,dist,sub}=G;
const sd=(Sx,X)=>{
  if(Sx.type==='blend'){
    if(Math.abs(Math.abs(Sx.range[0])-Math.abs(Sx.range[1]))>1e-12)throw Error('variable radius');
    const sp=F.spineOf(Sx,1e-9).curve,t=G.curveProject(sp,X).t,c=G.curvePoint(sp,t),v=sub(X,c),rho=norm(v);
    return {d:rho-Math.abs(Sx.range[0]),n:mul(v,1/rho)};}
  return G.surfaceDistance(Sx,X);};
function nearest(S1,S2,v){let X=v;
  for(let it=0;it<10;it++){const a=sd(S1,X),b=sd(S2,X);if(!a.n||!b.n)return null;
    const JJ=[[dot(a.n,a.n),dot(a.n,b.n)],[dot(a.n,b.n),dot(b.n,b.n)]],det=JJ[0][0]*JJ[1][1]-JJ[0][1]*JJ[1][0];
    const l=[(a.d*JJ[1][1]-b.d*JJ[0][1])/det,(JJ[0][0]*b.d-JJ[1][0]*a.d)/det];
    const D=add(mul(a.n,-l[0]),mul(b.n,-l[1]));X=add(X,D);if(norm(D)<1e-14)break;}
  return X;}
for(const e of M.edges.values()){
  let c=e.curve; if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||!e.v)continue;
  const [A,B]=c.surfaces;if(A.type==='blendBound'||B.type==='blendBound')continue;
  if(A.type!=='blend'&&B.type!=='blend')continue;
  const r={id:e.id,sur:A.type+'/'+B.type,v:e.v,d:[],tol:[]};
  try{for(const vi of e.v){const V=M.vertices.get(vi),X=nearest(A,B,V.p);r.d.push(X?dist(X,V.p):null);r.tol.push(V.tolerance);}}catch(x){r.err=x.message;}
  console.log(JSON.stringify(r));
}
