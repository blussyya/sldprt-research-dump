// own rational B-spline surface evaluator (Cox-de Boor), no converter code
function span(k,p,t){const n=k.length-p-2;if(t>=k[n+1])return n;if(t<=k[p])return p;let lo=p,hi=n+1,m;
  while(hi-lo>1){m=(lo+hi)>>1;if(t<k[m])hi=m;else lo=m;}return lo;}
function basis(k,p,t){const i=span(k,p,t),N=new Array(p+1).fill(0),l=[],r=[];N[0]=1;
  for(let j=1;j<=p;j++){l[j]=t-k[i+1-j];r[j]=k[i+j]-t;let s=0;
    for(let q=0;q<j;q++){const tmp=N[q]/(r[q+1]+l[j-q]);N[q]=s+r[q+1]*tmp;s=l[j-q]*tmp;}N[j]=s;}
  return {i,N};}
function surf(S,u,v){const bu=basis(S.ku,S.du,u),bv=basis(S.kv,S.dv,v);let x=0,y=0,z=0,w=0;
  for(let a=0;a<=S.du;a++)for(let b=0;b<=S.dv;b++){const I=bu.i-S.du+a,J=bv.i-S.dv+b,c=S.ctrl[I][J],wt=S.weights?S.weights[I][J]:1,f=bu.N[a]*bv.N[b]*wt;
    x+=f*c[0];y+=f*c[1];z+=f*c[2];w+=f;}return [x/w,y/w,z/w];}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
module.exports={surf,dist};
function curvePt(C,t){const k=C.knots,p=C.degree,b=basis(k,p,t);let x=0,y=0,z=0,w=0;
  for(let a=0;a<=p;a++){const I=b.i-p+a,c=C.ctrl[I],wt=C.weights?C.weights[I]:1,f=b.N[a]*wt;x+=f*c[0];y+=f*c[1];z+=f*c[2];w+=f;}return [x/w,y/w,z/w];}
// nearest point of surface to q, seeded at uv, local damped Gauss-Newton via finite diff + coordinate search
function foot(S,q,uv){let [u,v]=uv,bd=dist(surf(S,u,v),q),hu=1e-3,hv=1e-2;
  for(let k=0;k<200;k++){let imp=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const uu=Math.min(1,Math.max(0,u+a*hu)),vv=Math.min(1,Math.max(0,v+b*hv)),dd=dist(surf(S,uu,vv),q);if(dd<bd){bd=dd;u=uu;v=vv;imp=true;}}
    if(!imp){hu/=2;hv/=2;if(hu<1e-15)break;}}
  return {u,v,d:bd};}
module.exports.curvePt=curvePt;module.exports.foot=foot;
