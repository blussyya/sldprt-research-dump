// Own exact-spine machinery: signed distance functions g1,g2 of a blend's two spine surfaces, own Newton,
// own foot-to-intersection distance. Surface evaluation = own NURBS (nurbs.js) for B-spline bases.
const NB=require('./nurbs');
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=NB.sub,mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=NB.norm,unit=a=>mul(a,1/norm(a));
function mkSurfFoot(S){ // own foot-point on a B-spline surface
  const u0=S.ku[S.du],u1=S.ku[S.ctrl.length],v0=S.kv[S.dv],v1=S.kv[S.ctrl[0].length],G=70,grid=[];
  for(let i=0;i<=G;i++)for(let j=0;j<=G;j++){const u=u0+(u1-u0)*i/G,v=v0+(v1-v0)*j/G;grid.push([u,v,NB.surface(S,u,v)]);}
  const cl=(x,a,b)=>Math.min(b,Math.max(a,x));
  const ev=(u,v)=>NB.surface(S,cl(u,u0,u1),cl(v,v0,v1));
  let last=null;
  return function foot(X){
    let u,v;
    const refine=(u,v)=>{for(let it=0;it<60;it++){const h=1e-7*(u1-u0),k=1e-7*(v1-v0),P=ev(u,v),
        Su=mul(sub(ev(u+h,v),ev(u-h,v)),1/(2*h)),Sv=mul(sub(ev(u,v+k),ev(u,v-k)),1/(2*k)),r=sub(X,P);
        const a=dot(Su,Su),b=dot(Su,Sv),c=dot(Sv,Sv),f1=dot(Su,r),f2=dot(Sv,r),det=a*c-b*b;
        if(Math.abs(det)<1e-300)break;const du=(c*f1-b*f2)/det,dv=(a*f2-b*f1)/det;
        const nu=cl(u+du,u0,u1),nv=cl(v+dv,v0,v1),st=Math.hypot(nu-u,nv-v);u=nu;v=nv;if(st<1e-14)break;}
      return {u,v,P:ev(u,v)};};
    let best=null;
    if(last){best=refine(last.u,last.v);best.d=NB.dist(best.P,X);if(best.d>2e-3)best=null;} // seed only trusted when close
    if(!best){let bd=Infinity,bg=null;for(const g of grid){const d=NB.dist(g[2],X);if(d<bd){bd=d;bg=g;}}
      best=refine(bg[0],bg[1]);best.d=NB.dist(best.P,X);}
    last=best;
    const h=1e-7*(u1-u0),k=1e-7*(v1-v0),Su=sub(ev(best.u+h,best.v),ev(best.u-h,best.v)),Sv=sub(ev(best.u,best.v+k),ev(best.u,best.v-k));
    return {q:best.P,n:unit(cross(Su,Sv))};};
}
function mkCurveFoot(c){ // own foot on a B-spline curve (the nested spine, an axis of a pipe)
  const deg=c.degree,n=c.ctrl.length,a=c.knots[deg],b=c.knots[n],K=6000,pts=[];
  for(let i=0;i<=K;i++)pts.push(NB.curve(c,a+(b-a)*i/K));
  return X=>{let bd=Infinity,bi=0;for(let i=0;i<=K;i++){const d=(pts[i][0]-X[0])**2+(pts[i][1]-X[1])**2+(pts[i][2]-X[2])**2;if(d<bd){bd=d;bi=i;}}
    let lo=a+(b-a)*Math.max(0,bi-1)/K,hi=a+(b-a)*Math.min(K,bi+1)/K;
    for(let k=0;k<70;k++){const m1=lo+(hi-lo)*0.382,m2=lo+(hi-lo)*0.618;if(NB.dist(NB.curve(c,m1),X)<NB.dist(NB.curve(c,m2),X))hi=m2;else lo=m1;}
    return NB.curve(c,(lo+hi)/2);};
}
// g(S): signed distance function of a spine surface S (raw model object), given nested spine curves lookup
function mkG(S,nested){
  switch(S.type){
    case 'plane':return X=>dot(sub(X,S.p),S.n);
    case 'cylinder':return X=>{const q=sub(X,S.p),r=sub(q,mul(S.a,dot(q,S.a)));return norm(r)-S.r;};
    case 'offset':{if(S.basis.type!=='bspline')throw Error('offset of '+S.basis.type);const f=mkSurfFoot(S.basis),d=S.basis.sense===-1?-S.d:S.d;
      return X=>{const r=f(X);return dot(sub(X,r.q),r.n)-d;};}
    case 'blend':{const r=Math.abs(S.range[0]),cf=mkCurveFoot(nested(S));return X=>norm(sub(X,cf(X)))-r;}
  }
  throw Error('mkG '+S.type);
}
function grad(g,X,h=2e-8){const o=[0,0,0];for(let i=0;i<3;i++){const a=[...X],b=[...X];a[i]+=h;b[i]-=h;o[i]=(g(a)-g(b))/(2*h);}return o;}
// Own Newton: Y with g1=g2=0 and (Y-X0).T=0
function solve(g1,g2,X0,T,Y0){let Y=Y0||X0,F;
  for(let it=0;it<40;it++){const n1=grad(g1,Y),n2=grad(g2,Y);F=[g1(Y),g2(Y),dot(sub(Y,X0),T)];
    const c0=cross(n2,T),c1=cross(T,n1),c2=cross(n1,n2),det=dot(n1,c0);
    const D=mul(add(add(mul(c0,F[0]),mul(c1,F[1])),mul(c2,F[2])),-1/det);Y=add(Y,D);if(norm(D)<1e-15)break;}
  F=[g1(Y),g2(Y)];return {Y,res:Math.max(Math.abs(F[0]),Math.abs(F[1]))};}
// distance from X (near the exact spine) to the exact spine = foot on the intersection curve
function trueDist(g1,g2,X,T0){let T=unit(T0),r=solve(g1,g2,X,T);
  for(let k=0;k<3;k++){let Tn=unit(cross(grad(g1,r.Y),grad(g2,r.Y)));if(dot(Tn,T)<0)Tn=mul(Tn,-1);T=Tn;r=solve(g1,g2,X,T,r.Y);}
  return {d:NB.dist(r.Y,X),res:r.res,Y:r.Y};}
module.exports={mkG,trueDist,solve,grad,unit,cross,dot,sub,add,mul};
