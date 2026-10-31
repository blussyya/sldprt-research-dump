const R=process.argv[2], file=process.argv[3];
const S=require(R+'/src'), N=require(R+'/src/brep/native'), G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(file).parsed);
const {sub,add,mul,dot,cross,norm,dist}=G;
function solve3(A,b){ // A 2x2 
  const det=A[0][0]*A[1][1]-A[0][1]*A[1][0];
  return [(b[0]*A[1][1]-b[1]*A[0][1])/det,(A[0][0]*b[1]-A[1][0]*b[0])/det];
}
// nearest point of S1∩S2 to v by iterated min-norm Gauss-Newton
function nearest(S1,S2,v){
  let X=v;
  for(let it=0;it<10;it++){
    const a=G.surfaceDistance(S1,X),b=G.surfaceDistance(S2,X);
    if(!a.n||!b.n)return null;
    const f=[a.d,b.d];
    const JJ=[[dot(a.n,a.n),dot(a.n,b.n)],[dot(a.n,b.n),dot(b.n,b.n)]];
    const l=solve3(JJ,f);
    const D=add(mul(a.n,-l[0]),mul(b.n,-l[1]));
    X=add(X,D);
    if(norm(D)<1e-14)break;
  }
  const a=G.surfaceDistance(S1,X),b=G.surfaceDistance(S2,X);
  return {X,res:Math.max(Math.abs(a.d),Math.abs(b.d))};
}
const out=[];
for(const e of M.edges.values()){
  let c=e.curve; if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||!e.v)continue;
  const [A,B]=c.surfaces;
  if(A.type==='blendBound'||B.type==='blendBound')continue;
  if(A.type==='blend'||B.type==='blend')continue;
  const r={id:e.id,sur:A.type+'/'+B.type,v:e.v,d:[],tol:[]};
  for(const vi of e.v){const V=M.vertices.get(vi);let n;try{n=nearest(A,B,V.p);}catch(x){n=null}
    r.d.push(n?dist(n.X,V.p):null);r.tol.push(V.tolerance);r.res=n?n.res:null;}
  out.push(r);console.error(JSON.stringify(r));
}
const big=out.filter(r=>r.d.some(d=>d===null||d>5e-9));
console.log('inter edges checked',out.length,'with a vertex >5e-9 off or unknown:',big.length);
for(const r of big)console.log(JSON.stringify(r));
require('fs').writeFileSync(process.argv[4],JSON.stringify(out));
