// Claim B: compare the converters' own corrector points with my independent exact points along each fitted spine; locate the 1e-8-level misses.
const {surf,dist,curvePt}=require('./nurbs');
const RD='/home/user/conv-dev',RB='/home/user/solidworks-converters';
const S=require(RD+'/src'),N=require(RD+'/src/brep/native'),FD=require(RD+'/src/brep/fit'),FB=require(RB+'/src/brep/fit');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],nrm=a=>Math.hypot(...a),unit=a=>{const n=nrm(a);return a.map(x=>x/n)};
const rng=C=>[C.knots[C.degree],C.knots[C.knots.length-C.degree-1]];
function tang(C,t){const [lo,hi]=rng(C),h=1e-7*(hi-lo),a=curvePt(C,Math.max(lo,t-h)),b=curvePt(C,Math.min(hi,t+h));return unit(sub(b,a));}
function nearestOnCurve(C,q,seed){const [lo,hi]=rng(C);let t=seed;let h=(hi-lo)/3000*20;let l=Math.max(lo,t-h),r=Math.min(hi,t+h);
  for(let k=0;k<90;k++){const m1=l+(r-l)*.382,m2=l+(r-l)*.618;if(dist(curvePt(C,m1),q)<dist(curvePt(C,m2),q))r=m2;else l=m1;}t=(l+r)/2;return {t,p:curvePt(C,t)};}
const spD=require('./spines-dev.json'),spB=require('./spines-branch.json');
const NS=+process.env.NS||3000;
for(const id of [9821,10371,9931,10129,10349]){
  const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);const c=fc.surface.spine.type==='trimmed'?fc.surface.spine.basis:fc.surface.spine;
  for(const [name,F,sp] of [['dev',FD,spD[id]],['branch',FB,spB[id]]]){
    const C=sp.curve,[lo,hi]=rng(C);const cache=new Map();let mx=0,at=0,nfail=0,over=0;const hist={};
    for(let i=0;i<=NS;i++){const t=lo+(hi-lo)*i/NS,X=curvePt(C,t),T=tang(C,t);let Y;
      try{Y=F.corrector(c.surfaces[0],c.surfaces[1],X,T,cache);}catch(e){nfail++;continue;}
      const d=dist(nearestOnCurve(C,Y,t).p,Y);if(d>1e-8)over++;if(d>mx){mx=d;at=i/NS;}}
    console.log(id,name,'reported',sp.error.toExponential(2),'| converter corrector points: max dist to fitted spine',mx.toExponential(2),'at frac',at.toFixed(4),'| >1e-8:',over,'| failed',nfail);}}
