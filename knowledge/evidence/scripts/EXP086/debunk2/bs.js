// own NURBS surface evaluator with extension models
function span(k,p,n,t){ // clamped span index
  if(t>=k[n])return n-1; if(t<=k[p])return p;
  let lo=p,hi=n;while(hi-lo>1){const m=(lo+hi)>>1;if(t<k[m])hi=m;else lo=m;}return lo;}
function basis(k,p,i,t){const N=[1],l=[],r=[];
  for(let j=1;j<=p;j++){l[j]=t-k[i+1-j];r[j]=k[i+j]-t;let s=0;const M=[];
    for(let q=0;q<j;q++){const d=r[q+1]+l[j-q];const tmp=d?N[q]/d:0;M[q]=s+r[q+1]*tmp;s=l[j-q]*tmp;}M[j]=s;for(let q=0;q<=j;q++)N[q]=M[q];}
  return N;}
function core(S,u,v){ // polynomial continuation of end spans
  const nu=S.ctrl.length,nv=S.ctrl[0].length;
  const iu=span(S.ku,S.du,nu,u),iv=span(S.kv,S.dv,nv,v),bu=basis(S.ku,S.du,iu,u),bv=basis(S.kv,S.dv,iv,v);
  let P=[0,0,0],W=0;
  for(let a=0;a<=S.du;a++)for(let b=0;b<=S.dv;b++){const i=iu-S.du+a,j=iv-S.dv+b,w=S.weights?S.weights[i][j]:1,f=bu[a]*bv[b]*w,q=S.ctrl[i][j];
    P[0]+=q[0]*f;P[1]+=q[1]*f;P[2]+=q[2]*f;W+=f;}
  return [P[0]/W,P[1]/W,P[2]/W];}
const A=(a,b,s=1)=>a.map((x,i)=>x+s*b[i]);
function range(S){return {u0:S.ku[S.du],u1:S.ku[S.ctrl.length],v0:S.kv[S.dv],v1:S.kv[S.ctrl[0].length]};}
// model: 'clamp','poly','tan','quad'
function ev(S,u,v,model){
  const r=range(S);const uc=Math.min(r.u1,Math.max(r.u0,u)),vc=Math.min(r.v1,Math.max(r.v0,v));
  if(model==='poly')return core(S,u,v);
  if(uc===u&&vc===v)return core(S,u,v);
  if(model==='clamp')return core(S,uc,vc);
  // one-direction (and corner) extension: expand in Taylor about the clamped point
  const hu=1e-5*(r.u1-r.u0),hv=1e-5*(r.v1-r.v0);
  const du=u-uc,dv=v-vc;let P=core(S,uc,vc);
  // inward-biased derivs: core is polynomial, so central diff is exact enough
  const Su=A(core(S,uc+hu,vc),core(S,uc-hu,vc),-1).map(x=>x/(2*hu));
  const Sv=A(core(S,uc,vc+hv),core(S,uc,vc-hv),-1).map(x=>x/(2*hv));
  P=A(A(P,Su,du),Sv,dv);
  if(model==='quad'){
    const c=core(S,uc,vc);
    const Suu=A(A(core(S,uc+hu,vc),core(S,uc-hu,vc)),c,-2).map(x=>x/(hu*hu));
    const Svv=A(A(core(S,uc,vc+hv),core(S,uc,vc-hv)),c,-2).map(x=>x/(hv*hv));
    const Suv=[0,1,2].map(i=>(core(S,uc+hu,vc+hv)[i]-core(S,uc+hu,vc-hv)[i]-core(S,uc-hu,vc+hv)[i]+core(S,uc-hu,vc-hv)[i])/(4*hu*hv));
    P=A(A(A(P,Suu,du*du/2),Svv,dv*dv/2),Suv,du*dv);
  }
  return P;}
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
// foot point: min |P-S|, search over extended domain
function foot(S,P,model,ext=3){
  const r=range(S);const U0=r.u0-ext*(r.u1-r.u0)*0.0-0,U1=r.u1;
  let best=null;const G=40;
  const ue=ext*0.05*(r.u1-r.u0), ve=ext; // v extension in parameter units
  const lo=[r.u0-(model==='clamp'?0:ue),r.v0-(model==='clamp'?0:ve)],hi=[r.u1+(model==='clamp'?0:ue),r.v1+(model==='clamp'?0:ve)];
  for(let i=0;i<=G;i++)for(let j=0;j<=G;j++){const u=lo[0]+(hi[0]-lo[0])*i/G,v=lo[1]+(hi[1]-lo[1])*j/G;const d=dist(P,ev(S,u,v,model));if(!best||d<best.d)best={u,v,d};}
  // refine by shrinking pattern search
  let su=(hi[0]-lo[0])/G,sv=(hi[1]-lo[1])/G;
  for(let it=0;it<200;it++){let imp=false;
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const u=best.u+a*su,v=best.v+b*sv;
      if(model==='clamp'){/*stay*/}
      const d=dist(P,ev(S,u,v,model));if(d<best.d){best={u,v,d};imp=true;}}
    if(!imp){su/=2;sv/=2;}}
  return best;}
module.exports={ev,foot,range,core,dist};
