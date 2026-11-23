// Own B-spline / NURBS evaluation (Cox-de Boor), independent of the converter.
function span(kn,deg,n,u){ // n = number of ctrl pts
  if(u>=kn[n])return n-1; if(u<=kn[deg])return deg;
  let lo=deg,hi=n; while(hi-lo>1){const m=(lo+hi)>>1; if(u<kn[m])hi=m; else lo=m;} return lo;}
function basis(kn,deg,i,u){const N=new Array(deg+1).fill(0),L=[],R=[];N[0]=1;
  for(let j=1;j<=deg;j++){L[j]=u-kn[i+1-j];R[j]=kn[i+j]-u;let s=0;
    for(let r=0;r<j;r++){const d=R[r+1]+L[j-r],t=d===0?0:N[r]/d;N[r]=s+R[r+1]*t;s=L[j-r]*t;}N[j]=s;}
  return N;}
function curve(c,u){const deg=c.degree||3,n=c.ctrl.length,kn=c.knots,i=span(kn,deg,n,u),B=basis(kn,deg,i,u);
  const w=c.weights;let x=0,y=0,z=0,W=0;
  for(let j=0;j<=deg;j++){const k=i-deg+j,b=B[j]*(w?w[k]:1);x+=b*c.ctrl[k][0];y+=b*c.ctrl[k][1];z+=b*c.ctrl[k][2];W+=b;}
  return [x/W,y/W,z/W];}
function surface(s,u,v){const du=s.du,dv=s.dv,nu=s.ctrl.length,nv=s.ctrl[0].length;
  const iu=span(s.ku,du,nu,u),iv=span(s.kv,dv,nv,v),Bu=basis(s.ku,du,iu,u),Bv=basis(s.kv,dv,iv,v);
  let x=0,y=0,z=0,W=0;
  for(let a=0;a<=du;a++)for(let b=0;b<=dv;b++){const ia=iu-du+a,ib=iv-dv+b,w=s.weights?s.weights[ia][ib]:1,f=Bu[a]*Bv[b]*w;
    const P=s.ctrl[ia][ib];x+=f*P[0];y+=f*P[1];z+=f*P[2];W+=f;}
  return [x/W,y/W,z/W];}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],norm=a=>Math.hypot(a[0],a[1],a[2]);
const dist=(a,b)=>norm(sub(a,b));
// min over t in [a,b] of |f(t)-q|: grid then golden refinement around best grid cells
function foot(f,q,a,b,K=2000){let bi=0,bd=Infinity;const d=[];
  for(let i=0;i<=K;i++){const t=a+(b-a)*i/K;d[i]=dist(f(t),q);if(d[i]<bd){bd=d[i];bi=i;}}
  let lo=a+(b-a)*Math.max(0,bi-1)/K,hi=a+(b-a)*Math.min(K,bi+1)/K;
  for(let k=0;k<80;k++){const m1=lo+(hi-lo)*0.382,m2=lo+(hi-lo)*0.618;if(dist(f(m1),q)<dist(f(m2),q))hi=m2;else lo=m1;}
  const t=(lo+hi)/2;return {t,d:dist(f(t),q)};}
module.exports={curve,surface,dist,sub,norm,foot};
