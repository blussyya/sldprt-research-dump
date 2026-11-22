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
  if(s.type==='offset'){const B=s.basis;if(B.type!=='bspline')throw Error('offset basis '+B.type);const r=Math.abs(s.d);let uv=null,calls=0;
    const U0=B.ku[0],U1=B.ku[B.ku.length-1],V0=B.kv[0],V1=B.kv[B.kv.length-1];const P=(a,b)=>surf(B,U0+(U1-U0)*a,V0+(V1-V0)*b);
    return q=>{ // own foot on B-spline basis, search in normalised parameters
      const refine=(u,v)=>{let bd=dist(P(u,v),q),hu=1e-3,hv=1e-3;
        for(let k=0;k<400;k++){let imp=false;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const uu=Math.min(1,Math.max(0,u+a*hu)),vv=Math.min(1,Math.max(0,v+b*hv)),dd=dist(P(uu,vv),q);if(dd<bd){bd=dd;u=uu;v=vv;imp=true;}}if(!imp){hu/=2;hv/=2;if(hu<1e-14)break;}}
        return {u,v,bd};};
      let best;
      if(!uv||q.__global){const G=300,cand=[];for(let i=0;i<=G;i++)for(let j=0;j<=G;j++)cand.push([dist(P(i/G,j/G),q),i/G,j/G]);cand.sort((a,b)=>a[0]-b[0]);
        // best 12 grid cells that are local minima-ish, refine each, keep the nearest
        best=null;for(const c of cand.slice(0,40)){const r=refine(c[1],c[2]);if(!best||r.bd<best.bd)best=r;}}
      else{best=refine(uv[0],uv[1]);
        // guard against a lost foot: a global re-seed every 25th call
        if((++calls)%25===0){const G=120;let b2=null;for(let i=0;i<=G;i++)for(let j=0;j<=G;j++){const d=dist(P(i/G,j/G),q);if(!b2||d<b2[0])b2=[d,i/G,j/G];}const r=refine(b2[1],b2[2]);if(r.bd<best.bd-1e-12)best=r;}}
      let {u,v,bd}=best;
      uv=[u,v];const p=P(u,v);return {d:bd-r,g:unit(sub(q,p))};};}
  if(s.type==='blend'){const r=Math.abs(s.range[0]);if(Math.abs(Math.abs(s.range[1])-r)>1e-12)throw Error('nonconst blend');
    const C=FD.spineOf(s,1e-10).curve;let seed;
    return q=>{const n=nearestOnCurve(C,q,seed);seed=n.t;const v=sub(q,n.p);return {d:nrm(v)-r,g:unit(v)};};}
  throw Error('support '+s.type);}
function solve3(A,b){const [a,bb,c]=A,det=(m)=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  const D=det(A),out=[];for(let k=0;k<3;k++){const m=A.map((r,i)=>r.map((x,j)=>j===k?b[i]:x));out.push(det(m)/D);}return out;}
function exactPoint(F1,F2,X,T){for(let it=0;it<30;it++){const a=F1(X),b=F2(X);const dl=solve3([a.g,b.g,T],[-a.d,-b.d,0]);X=[X[0]+dl[0],X[1]+dl[1],X[2]+dl[2]];if(nrm(dl)<1e-15)break;}
  const a=F1(X),b=F2(X);return {X,res:Math.max(Math.abs(a.d),Math.abs(b.d))};}
const only=process.argv.slice(2).map(Number);
globalThis.ZONE=process.env.ZONE;const ids=only.length?only:[9821,10371,9931,10129,10349];
const rows=[];const NS=+process.env.NS||1500;
for(const id of ids){const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);const c=fc.surface.spine.type==='trimmed'?fc.surface.spine.basis:fc.surface.spine;
  const F1=makeField(c.surfaces[0]),F2=makeField(c.surfaces[1]);
  const spD=require('./spines-dev.json')[id],spB=require('./spines-branch.json')[id];const C=spD.curve,[lo,hi]=rng(C);
  // control 1: exact-point solver on a known exact point of the surfaces ought to leave it fixed and a perturbed start returns to it
  const t0=lo+(hi-lo)*0.5,X0=curvePt(C,t0),T0=tang(C,t0);const e0=exactPoint(F1,F2,X0,T0);
  const kick=exactPoint(F1,F2,[e0.X[0]+3e-7*T0[1],e0.X[1]-3e-7*T0[0],e0.X[2]],T0);
  if(process.env.ZONE){const out=[];for(const [a,b] of [[0,0.01],[0.99,1]]){let line=[];for(let i=0;i<=40;i++){const fr=a+(b-a)*i/40,t=lo+(hi-lo)*fr,X=curvePt(C,t),T=tang(C,t);const e=exactPoint(F1,F2,X,T);
      const g1=F1(e.X).g,g2=F2(e.X).g,sinA=nrm([g1[1]*g2[2]-g1[2]*g2[1],g1[2]*g2[0]-g1[0]*g2[2],g1[0]*g2[1]-g1[1]*g2[0]]);
      const nd=nearestOnCurve(C,e.X,t).p;line.push(fr.toFixed(4)+' d='+dist(nd,e.X).toExponential(1)+' sinA='+sinA.toExponential(1)+' res='+e.res.toExponential(0));}
      console.log(id,'zone',a,'-',b,'\n  '+line.filter((_,i)=>i%4==0||i>=38).join('\n  '));}continue;}
  console.log(id,'solver control: residual',e0.res.toExponential(1),'; restart from 3e-7 away returns',nrm(sub(kick.X,e0.X)).toExponential(1),'(perp part only)');
  let mxD=0,at=0,mxB=0,worst=[],resMax=0;const devs=[],exLast=[];
  for(let i=0;i<=NS;i++){const t=lo+(hi-lo)*i/NS,X=curvePt(C,t),T=tang(C,t);const e=exactPoint(F1,F2,X,T);resMax=Math.max(resMax,e.res);exLast.push(e.X);
    const dD=nearestOnCurve(C,e.X,t).p,dB=nearestOnCurve(spB.curve,e.X,t);const d1=dist(dD,e.X),d2=dist(dB.p,e.X);devs.push([i/NS,d1,d2,e.res]);
    if(d1>mxD){mxD=d1;at=i/NS;}if(d2>mxB)mxB=d2;}
  const inter=Math.max(...devs.slice(2,NS-1).map(x=>x[1])),interB=Math.max(...devs.slice(2,NS-1).map(x=>x[2]));
  // control: same measurement against a copy of the dev spine shifted 2e-8 m in x -> must read about 2e-8 (times the share of x normal to the curve)
  const Cs={...C,ctrl:C.ctrl.map(p=>[p[0]+2e-8,p[1],p[2]])};let cm=0;for(let i=2;i<=NS;i+=1){const t=lo+(hi-lo)*i/NS;if(i>=NS-1)break;cm=Math.max(cm,dist(nearestOnCurve(Cs,exLast[i],t).p,exLast[i]));}
  console.log(id,'INTERIOR (all but the first 2 and last 2 samples (>4 um from either end)): own true max dist dev',inter.toExponential(2),'branch',interB.toExponential(2),'| control (spine shifted 2e-8) reads',cm.toExponential(2));
  if(process.env.DBG){devs.map((x,i)=>[i,...x]).filter(x=>x[2]>1e-8||x[4]>1e-9).slice(0,12).forEach(x=>console.log('   BAD idx',x[0],'dev dist',x[2].toExponential(1),'res',x[4].toExponential(1)));}
  const big=devs.filter(x=>x[1]>1e-8).length;
  console.log(id,'reported dev',spD.error.toExponential(2),'branch',spB.error.toExponential(2),'| OWN true max dist to exact curve: dev',mxD.toExponential(2),'at',at.toFixed(3),' branch',mxB.toExponential(2),'| solver residual max',resMax.toExponential(1),'| pts over 1e-8 (dev):',big);
  const s=[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1].map(x=>devs[Math.round(x*NS)]);console.log('   dev true dist by param:',s.map(x=>x[0].toFixed(1)+':'+x[1].toExponential(1)).join(' '));
  rows.push({id,devs});}
require('fs').writeFileSync('d4-out-'+(only.join('_')||'all')+'.json',JSON.stringify(rows));
