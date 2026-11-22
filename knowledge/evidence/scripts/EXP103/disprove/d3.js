const {basis,curvePt,dist}=Object.assign({},require('./nurbs'));
const a=require('./spines-dev.json'),b=require('./spines-branch.json');
const rng=C=>[C.knots[C.degree],C.knots[C.knots.length-C.degree-1]];
function proj(C,q,t0){const [lo,hi]=rng(C);let t=t0,bt=t,bd=dist(curvePt(C,t),q);let h=(hi-lo)/50;
  // coarse scan if no seed
  if(t0===undefined){for(let i=0;i<=2000;i++){const tt=lo+(hi-lo)*i/2000,d=dist(curvePt(C,tt),q);if(d<bd||t0===undefined&&i===0){bd=d;bt=tt;}}t=bt;h=(hi-lo)/2000;}
  let l=Math.max(lo,t-h),r=Math.min(hi,t+h);for(let k=0;k<80;k++){const m1=l+(r-l)*.382,m2=l+(r-l)*.618;if(dist(curvePt(C,m1),q)<dist(curvePt(C,m2),q))r=m2;else l=m1;}
  const tt=(l+r)/2;return {t:tt,d:dist(curvePt(C,tt),q)};}
for(const id of Object.keys(a)){const A=a[id].curve,B=b[id].curve,[lo,hi]=rng(A);let m=0,m2=0;
  for(let i=0;i<=3000;i++){const q=curvePt(A,lo+(hi-lo)*i/3000);m=Math.max(m,proj(B,q).d);const q2=curvePt(B,rng(B)[0]+(rng(B)[1]-rng(B)[0])*i/3000);m2=Math.max(m2,proj(A,q2).d);}
  console.log(id,'max geometric distance dev<->branch',m.toExponential(2),m2.toExponential(2));}
// control: distinct curve (shifted by 1e-9 in x) must read 1e-9
const A=a[9821].curve;const S={...A,ctrl:A.ctrl.map(p=>[p[0]+1e-9,p[1],p[2]])};let mm=0;const [lo,hi]=rng(A);for(let i=0;i<=500;i++)mm=Math.max(mm,proj(S,curvePt(A,lo+(hi-lo)*i/500)).d);console.log('control shifted 1e-9 reads',mm);
