// Claim B: independent exact intersection points along each blend spine; true distance fitted spine -> exact curve.
const {surf,dist,curvePt}=require('./nurbs');
const RD='/home/user/conv-dev',RB='/home/user/solidworks-converters';
const S=require(RD+'/src'),N=require(RD+'/src/brep/native'),FD=require(RD+'/src/brep/fit'),FB=require(RB+'/src/brep/fit');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],nrm=a=>Math.hypot(...a),unit=a=>{const n=nrm(a);return a.map(x=>x/n)};
const rng=C=>[C.knots[C.degree],C.knots[C.knots.length-C.degree-1]];
function tang(C,t){const [lo,hi]=rng(C),h=1e-7*(hi-lo),a=curvePt(C,Math.max(lo,t-h)),b=curvePt(C,Math.min(hi,t+h));return unit(sub(b,a));}
function nearestOnCurve(C,q,seed){const [lo,hi]=rng(C);let t=seed;
  if(t===undefined){let bd=1e9;for(let i=0;i<=3000;i++){const tt=lo+(hi-lo)*i/3000,d=dist(curvePt(C,tt),q);if(d<bd){bd=d;t=tt;}}}
  let h=(hi-lo)/3000*(seed===undefined?1:20);let l=Math.max(lo,t-h),r=Math.min(hi,t+h);
  for(let k=0;k<90;k++){const m1=l+(r-l)*.382,m2=l+(r-l)*.618;if(dist(curvePt(C,m1),q)<dist(curvePt(C,m2),q))r=m2;else l=m1;}
  t=(l+r)/2;return {t,p:curvePt(C,t)};}
// signed-free distance field of a support: returns {d,g(unit gradient)} , with warm start state
function makeField(s){
  if(s.type==='offset'){const B=s.basis;if(B.type!=='bspline')throw Error('offset basis '+B.type);const r=Math.abs(s.d);let uv=null;
    const U0=B.ku[0],U1=B.ku[B.ku.length-1],V0=B.kv[0],V1=B.kv[B.kv.length-1];const P=(a,b)=>surf(B,U0+(U1-U0)*a,V0+(V1-V0)*b);
    return q=>{ // own foot on B-spline basis, search in normalised parameters
      if(!uv){let bd=1e9;for(let i=0;i<=120;i++)for(let j=0;j<=120;j++){const d=dist(P(i/120,j/120),q);if(d<bd){bd=d;uv=[i/120,j/120];}}}
      let [u,v]=uv,bd=dist(P(u,v),q),hu=1e-3,hv=1e-3;
      for(let k=0;k<300;k++){let imp=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const uu=Math.min(1,Math.max(0,u+a*hu)),vv=Math.min(1,Math.max(0,v+b*hv)),dd=dist(P(uu,vv),q);if(dd<bd){bd=dd;u=uu;v=vv;imp=true;}}if(!imp){hu/=2;hv/=2;if(hu<1e-14)break;}}
      uv=[u,v];const p=P(u,v);return {d:bd-r,g:unit(sub(q,p))};};}
  if(s.type==='blend'){const r=Math.abs(s.range[0]);if(Math.abs(Math.abs(s.range[1])-r)>1e-12)throw Error('nonconst blend');
    const C=FD.spineOf(s,1e-10).curve;let seed;
    return q=>{const n=nearestOnCurve(C,q,seed);seed=n.t;const v=sub(q,n.p);return {d:nrm(v)-r,g:unit(v)};};}
  throw Error('support '+s.type);}
function solve3(A,b){const [a,bb,c]=A,det=(m)=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D=det(A),out=[];for(let k=0;k<3;k++){const m=A.map((r,i)=>r.map((x,j)=>j===k?b[i]:x));out.push(det(m)/D);}return out;}
function exactPoint(F1,F2,X,T){for(let it=0;it<30;it++){const a=F1(X),b=F2(X);const dl=solve3([a.g,b.g,T],[-a.d,-b.d,0]);X=[X[0]+dl[0],X[1]+dl[1],X[2]+dl[2]];if(nrm(dl)<1e-15)break;}
  const a=F1(X),b=F2(X);return {X,res:Math.max(Math.abs(a.d),Math.abs(b.d))};}

// geometric approach to the end: my exact point vs converter corrector (branch) vs fitted spine
const FBr=require('/home/user/solidworks-converters/src/brep/fit');
for(const id of [9821,9931]){
  const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);const c=fc.surface.spine.type==='trimmed'?fc.surface.spine.basis:fc.surface.spine;
  const F1=makeField(c.surfaces[0]),F2=makeField(c.surfaces[1]);const C=require('./spines-branch.json')[id].curve,[lo,hi]=rng(C);const cache=new Map();
  console.log(id,'dist-from-end(m)  mine->curve   corrector->curve   |mine-corrector|   sinA(normals)');
  const E=curvePt(C,hi);
  for(const k of [7,6.5,6,5.5,5,4.5,4,3.5,3.0,2.5]){const dm=Math.pow(10,-k);
    // find t with |curve(t)-E|=dm by bisection
    let a=hi-(hi-lo)*0.01,b=hi;for(let q=0;q<100;q++){const m=(a+b)/2;if(nrm(sub(curvePt(C,m),E))>dm)a=m;else b=m;}const t=(a+b)/2,X=curvePt(C,t),T=tang(C,t);
    const e=exactPoint(F1,F2,X,T);const dMine=dist(nearestOnCurve(C,e.X,t).p,e.X);let Y;try{Y=FBr.corrector(c.surfaces[0],c.surfaces[1],X,T,cache);}catch(err){Y=null;}
    const g1=F1(e.X).g,g2=F2(e.X).g,sinA=nrm([g1[1]*g2[2]-g1[2]*g2[1],g1[2]*g2[0]-g1[0]*g2[2],g1[0]*g2[1]-g1[1]*g2[0]]);
    console.log('  ',dm.toExponential(1),dMine.toExponential(2),Y?dist(nearestOnCurve(C,Y,t).p,Y).toExponential(2):'fail',Y?dist(Y,e.X).toExponential(2):'-',sinA.toExponential(1));}}
