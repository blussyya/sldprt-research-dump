const {F,G,S1,S2,c,fs}=require('./common');
const pts=JSON.parse(fs.readFileSync('pts4.json'));
const bad=pts.find(p=>Math.abs(p.s-0.0603)<2e-5), good=pts.find(p=>Math.abs(p.s-0.06041)<2e-5);
const bs=S1.basis,d=S1.d;
const off=(u,v)=>{const e=G.surfaceEval(bs,u,v);const n=G.unit(G.cross(e.du,e.dv));return G.add(e.p,G.mul(n,d));};
function solve(X,u,v){for(let it=0;it<200;it++){const h=1e-6;const o=off(u,v);
  const J1=G.mul(G.sub(off(u+h,v),off(u-h,v)),1/(2*h)),J2=G.mul(G.sub(off(u,v+h),off(u,v-h)),1/(2*h)),r=G.sub(X,o);
  const A11=G.dot(J1,J1),A12=G.dot(J1,J2),A22=G.dot(J2,J2),g1=G.dot(J1,r),g2=G.dot(J2,r),det=A11*A22-A12*A12;if(!det)break;
  const du=(A22*g1-A12*g2)/det,dv=(A11*g2-A12*g1)/det;u+=du;v+=dv;if(Math.hypot(du,dv)<1e-14)break;}
  return {u,v,res:G.dist(off(u,v),X)};}
for(const [nm,q] of [['bad',bad],['good',good]]){
  const sols=[];
  for(let i=0;i<=30;i++)for(let j=0;j<=30;j++){const u=-30+25*i/30,v=40+45*j/30;const s=solve(q.X,u,v);
    if(s.res<1e-9&&!sols.some(t=>Math.hypot(t.u-s.u,t.v-s.v)<1e-5))sols.push(s);}
  console.log(nm,'exact solutions (offset surf incl. extension):',sols.map(s=>`(${s.u.toFixed(5)},${s.v.toFixed(5)}) res ${s.res.toExponential(1)}`).join('  '));
  // stationarity at converter foot
  const r=G.surfaceInverse(S1,q.X);const e=G.surfaceEval(bs,r.u,r.v);const rr=G.sub(q.X,e.p);
  console.log(' converter foot basis-stationarity: dot(r,du)/|du|',(G.dot(rr,e.du)/G.norm(e.du)).toExponential(2),'dot(r,dv)/|dv|',(G.dot(rr,e.dv)/G.norm(e.dv)).toExponential(2),'|r|',G.norm(rr),'(d=',d,')');
}
