// distance of the converter's corrector points to the fitted spine, binned by distance from the T-limit end (by arc fraction)
const {dist,curvePt}=require('./nurbs');
const RD='/home/user/conv-dev',RB='/home/user/solidworks-converters';
const S=require(RD+'/src'),N=require(RD+'/src/brep/native'),FD=require(RD+'/src/brep/fit'),FB=require(RB+'/src/brep/fit');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],nrm=a=>Math.hypot(...a),unit=a=>{const n=nrm(a);return a.map(x=>x/n)};
const rng=C=>[C.knots[C.degree],C.knots[C.knots.length-C.degree-1]];
function tang(C,t){const [lo,hi]=rng(C),h=1e-9*(hi-lo),a=curvePt(C,Math.max(lo,t-h)),b=curvePt(C,Math.min(hi,t+h));return unit(sub(b,a));}
function near(C,q,seed){const [lo,hi]=rng(C);let h=(hi-lo)/300;let l=Math.max(lo,seed-h),r=Math.min(hi,seed+h);
  for(let k=0;k<90;k++){const m1=l+(r-l)*.382,m2=l+(r-l)*.618;if(dist(curvePt(C,m1),q)<dist(curvePt(C,m2),q))r=m2;else l=m1;}return curvePt(C,(l+r)/2);}
const spD=require('./spines-dev.json'),spB=require('./spines-branch.json');
const id=+process.argv[2]||9821;
const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);const c=fc.surface.spine.type==='trimmed'?fc.surface.spine.basis:fc.surface.spine;
// distance from each end in metres along the curve
const C=spB[id].curve,[lo,hi]=rng(C);
const bins=[1e-9,1e-8,1e-7,1e-6,1e-5,1e-4,1e-3,1e-2,1e9];
for(const [name,F] of [['dev',FD],['branch',FB]]){for(const end of ['start','end']){
  const rows=bins.map(()=>({n:0,mx:0}));const cache=new Map();
  // points at geometric spacing from the end
  const L=nrm(sub(curvePt(C,hi),curvePt(C,lo)));
  const pts=[];for(let k=0;k<=400;k++){const dm=1e-10*Math.pow(10,k/400*9.5);pts.push(dm);}   // 1e-10 .. 3e-1 of the chord, in fractions of param
  const sorted=pts.map(fr=>end==='end'?hi-(hi-lo)*fr:lo+(hi-lo)*fr).sort((a,b)=>end==='end'?b-a:a-b);
  for(const t of sorted){const X=curvePt(C,t),T=tang(C,t);let Y;try{Y=F.corrector(c.surfaces[0],c.surfaces[1],X,T,cache);}catch(e){continue;}
    const dm=nrm(sub(X,curvePt(C,end==='end'?hi:lo)));const d=dist(near(C,Y,t),Y);const b=bins.findIndex(x=>dm<x);rows[b].n++;rows[b].mx=Math.max(rows[b].mx,d);}
  console.log(id,name,end,'max |corrector point - fitted spine| by distance from the end (m):',rows.map((r,i)=>(i?bins[i-1].toExponential(0):'0')+'..'+bins[i].toExponential(0)+':'+(r.n?r.mx.toExponential(1):'-')).join('  '));}}
