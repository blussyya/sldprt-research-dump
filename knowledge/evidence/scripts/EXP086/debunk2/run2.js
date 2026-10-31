const {ev,foot,range,dist}=require('./bs.js');const D=require('./data.json');
const S=D.surfs[1].b, s=D.surfs[1];
const cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
for(let i=12;i<19;i++){const P=D.chart[i];
 const out=[i];
 for(const m of ['clamp','poly','tan']){const f=foot(S,P,m);const h=1e-6;
  const Su=sub(ev(S,f.u+h,f.v,m),ev(S,f.u-h,f.v,m)),Sv=sub(ev(S,f.u,f.v+h,m),ev(S,f.u,f.v-h,m));
  let n=cr(Su,Sv);const L=Math.hypot(...n);n=n.map(x=>x/L);
  const q=sub(P,ev(S,f.u,f.v,m));const sd=q[0]*n[0]+q[1]*n[1]+q[2]*n[2];
  out.push(m+': res '+((f.d-0.009)*1e9).toFixed(0)+'nm signed(n=Su x Sv) '+(sd*1000).toFixed(6)+'mm');}
 console.log(out.join(' | '));}
// alternative: offset surface extended along its own tangent. O(u,v)=S+d*n (n=SuxSv unit, d=-sense*? try both signs) ; extension O(u,v0)+(v-v0)Ov
function O(u,v,sg){const h=1e-6,m='poly';const Su=sub(ev(S,u+h,v,m),ev(S,u-h,v,m)),Sv=sub(ev(S,u,v+h,m),ev(S,u,v-h,m));let n=cr(Su,Sv);const L=Math.hypot(...n);
 return ev(S,u,v,m).map((x,i)=>x+sg*0.009*n[i]/L);}
const r=range(S);
for(const sg of [1,-1]){console.log('offset-ext sign',sg);
 for(let i=14;i<19;i++){const P=D.chart[i];
  const Ex=(u,v)=>{if(v>=r.v0)return O(u,v,sg);const h=1e-5;const a=O(u,r.v0,sg),b=O(u,r.v0+h,sg);return a.map((x,k)=>x+(v-r.v0)*(b[k]-x)/h);};
  let best=null;for(let a=0;a<=60;a++)for(let b=0;b<=60;b++){const u=r.u0+(r.u1-r.u0)*a/60,v=r.v0-3+6*b/60;const d=dist(P,Ex(u,v));if(!best||d<best.d)best={u,v,d};}
  let su=(r.u1-r.u0)/60,sv=0.1;for(let it=0;it<150;it++){let imp=false;for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const u=best.u+x*su,v=best.v+y*sv,d=dist(P,Ex(u,v));if(d<best.d){best={u,v,d};imp=true}}if(!imp){su/=2;sv/=2}}
  console.log(i,'min dist chart->offset-extended surface',(best.d*1e6).toFixed(2),'um @v',best.v.toFixed(3));}}
