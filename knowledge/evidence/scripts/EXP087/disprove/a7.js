const {F,G,S1,S2,c,fs}=require('./common');
const pts=JSON.parse(fs.readFileSync('pts4.json'));
const bad=pts.find(p=>Math.abs(p.s-0.0603)<2e-5), good=pts.find(p=>Math.abs(p.s-0.06041)<2e-5);
const bs=S1.basis, d=S1.d, rng=G.surfaceRange(bs);
console.log('basis ranges',JSON.stringify(rng),'ctrl',bs.ctrl.length,bs.ctrl[0].length,'deg',bs.du,bs.dv,'rational?',!!bs.weights, 'plane',S2.p,S2.n);
const off=(u,v)=>{const e=G.surfaceEval(bs,u,v);const n=G.unit(G.cross(e.du,e.dv));return {p:G.add(e.p,G.mul(n,d)),b:e.p,n};};
// plane residual
for(const [nm,q] of [['bad',bad],['good',good]]){
  const X=q.X;console.log(nm,'plane dist',G.dot(G.sub(X,S2.p),S2.n).toExponential(2));
  const r=G.surfaceInverse(S1,X);const e=G.surfaceEval(S1,r.u,r.v);console.log(' converter foot uv',r.u.toFixed(5),r.v.toFixed(5),'|X-foot|',G.dist(X,e.p).toExponential(2));
}
// multistart: solve off(u,v)=X by Gauss-Newton on 3x2 system
function solve(X,u,v){for(let it=0;it<100;it++){const o=off(u,v),h=1e-6;const a=off(u+h,v),b2=off(u-h,v),c2=off(u,v+h),d2=off(u,v-h);
  const J1=G.mul(G.sub(a.p,b2.p),1/(2*h)),J2=G.mul(G.sub(c2.p,d2.p),1/(2*h)),r=G.sub(X,o.p);
  const A11=G.dot(J1,J1),A12=G.dot(J1,J2),A22=G.dot(J2,J2),g1=G.dot(J1,r),g2=G.dot(J2,r),det=A11*A22-A12*A12;if(!det)break;
  const du=(A22*g1-A12*g2)/det,dv=(A11*g2-A12*g1)/det;u+=du;v+=dv;if(Math.hypot(du,dv)<1e-14)break;}
  const o=off(u,v);return {u,v,res:G.dist(o.p,X)};}
const [[u0,u1],[v0,v1]]=rng;
for(const [nm,q] of [['bad',bad],['good',good]]){
  const sols=[];
  for(let i=0;i<=24;i++)for(let j=0;j<=24;j++){const u=u0+(u1-u0)*i/24,v=v0+(v1-v0)*j/24;const s=solve(q.X,u,v);
    if(s.res<1e-9&&s.u>=u0-1e-9&&s.u<=u1+1e-9&&s.v>=v0-1e-9&&s.v<=v1+1e-9&&!sols.some(t=>Math.hypot(t.u-s.u,t.v-s.v)<1e-6))sols.push(s);}
  console.log(nm,'in-range exact solutions:',sols.map(s=>`(${s.u.toFixed(5)},${s.v.toFixed(5)}) res ${s.res.toExponential(1)}`).join('  '));
}
