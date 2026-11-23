const NB=require('./nurbs'),{M}=require('./load')('/home/user/conv-dev');
const cap=require('/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP103/e844-capture.json');
const S=cap.c.surface,u0=cap.c.c2.ctrl[0][0],p0=cap.p0,p1=cap.p1,e844=M.edges.get(844);
const e={id:844,sameSense:cap.sameSense,tolerance:e844.tolerance};
const vt=[M.vertices.get(e844.v[0]).tolerance,M.vertices.get(e844.v[1]).tolerance];
// Own reanchor: the SP_CURVE's 2D curve is a v-line (u const) whose Parasolid u is off the fitted surface, so
// the followed curve is the v-iso-line S(u*,v) through both vertices: u* minimises dist(p0,iso)+dist(p1,iso).
const dIso=(u,q)=>NB.foot(v=>NB.surface(S,u,v),q,0,1,400).d;
function minU(score){let bu=0,bs=Infinity;for(let i=0;i<=400;i++){const sc=score(i/400);if(sc<bs){bs=sc;bu=i/400;}}
  let lo=Math.max(0,bu-1/400),hi=Math.min(1,bu+1/400);
  for(let k=0;k<70;k++){const m1=lo+(hi-lo)*0.382,m2=lo+(hi-lo)*0.618;if(score(m1)<score(m2))hi=m2;else lo=m1;}return (lo+hi)/2;}
const uSum=minU(u=>dIso(u,p0)+dIso(u,p1)),uMax=minU(u=>Math.max(dIso(u,p0),dIso(u,p1)));
console.log('u* (sum)',uSum,' u* (minimax)',uMax,' c2 u (Parasolid)',u0);
let USTAR=uSum;
let C=v=>NB.surface(S,USTAR,v);
const fa=NB.foot(C,p0,0,1,4000),fb=NB.foot(C,p1,0,1,4000);
console.log('vertex->followed iso-line: p0 d=',fa.d.toExponential(3),'v=',fa.t.toFixed(6),' p1 d=',fb.d.toExponential(3),'v=',fb.t.toFixed(6));
function measure(label,curve){
  const kn=curve.knots,deg=curve.degree,a=kn[deg],b=kn[curve.ctrl.length],f=t=>NB.curve(curve,t);
  const ends=[f(a),f(b)];
  // pair ends to vertices
  const d00=NB.dist(ends[0],p0)+NB.dist(ends[1],p1),d01=NB.dist(ends[0],p1)+NB.dist(ends[1],p0);
  const [q0,q1]=d00<=d01?[p0,p1]:[p1,p0];
  const endD=[NB.dist(ends[0],q0),NB.dist(ends[1],q1)];
  // (1) fitted curve -> followed curve: 20001 samples, foot on C over full v in [0,1]
  const N=20000;let m1=0,at1=0;
  for(let i=0;i<=N;i++){const t=a+(b-a)*i/N,r=NB.foot(C,f(t),0,1,600);if(r.d>m1){m1=r.d;at1=i/N;}}
  // (2) followed curve (between the feet of the fitted ends) -> fitted curve
  const ve=ends.map(q=>NB.foot(C,q,0,1,4000).t),vlo=Math.min(...ve),vhi=Math.max(...ve);
  let m2=0,at2=0;
  for(let i=0;i<=N;i++){const v=vlo+(vhi-vlo)*i/N,r=NB.foot(f,C(v),a,b,600);if(r.d>m2){m2=r.d;at2=i/N;}}
  // last-interval: restrict to outer 5% of each end
  const endMax=(lo,hi)=>{let m=0;for(let i=0;i<=2000;i++){const t=lo+(hi-lo)*i/2000;m=Math.max(m,NB.foot(C,f(t),0,1,600).d);}return m;};
  const L=b-a;
  console.log(`${label}: ctrl=${curve.ctrl.length} knots-span=[${a.toFixed(4)},${b.toFixed(4)}] endToVertex=[${endD.map(x=>x.toExponential(2))}]`);
  console.log(`   fitted->followed max ${m1.toExponential(3)} at frac ${at1.toFixed(4)}  (${N+1} samples)`);
  console.log(`   followed->fitted max ${m2.toExponential(3)} at frac ${at2.toFixed(4)}  (${N+1} samples, v in [${vlo.toFixed(5)},${vhi.toFixed(5)}])`);
  console.log(`   within vertex tol? ${endD[0]<=vt[0]&&endD[1]<=vt[1]}  (vertex tols ${vt.map(x=>x.toExponential(2))})`);
  return {m1,m2,endD};
}

const fits={};
for(const [name,R] of [['dev','/home/user/conv-dev'],['branch','/home/user/solidworks-converters']]){
  const F=require(R+'/src/brep/fit');
  const r=F.edgeCurve(e,JSON.parse(JSON.stringify(cap.c)),p0,p1,{tolerance:1e-8});
  console.log(`[${name}] edgeCurve reported error ${r.error.toExponential(3)}, ctrl ${r.curve.ctrl.length}`);fits[name]=r;}
// The iso-line u* the converter's fit follows is not pinned by "sum of vertex distances" (it is flat in u:
// shifting u trades p0's miss for p1's). Find it from the curves instead: u_f minimising the worst distance of
// the BRANCH curve's first 80% (away from the contested end) to the iso-line, and check the DEV curve agrees there.
function interiorDev(curve,u,lo,hi,n=300){const f=t=>NB.curve(curve,t),Cu=v=>NB.surface(S,u,v);let m=0;
  for(let i=0;i<=n;i++){m=Math.max(m,NB.foot(Cu,f(lo+(hi-lo)*i/n),0,1,300).d);}return m;}
const bc=fits.branch.curve;
const ug=[];for(let i=-30;i<=30;i++)ug.push(uSum+i*2e-7);
let bestU=uSum,bestM=Infinity;for(const u of ug){const m=interiorDev(bc,u,0.0,0.8,120);if(m<bestM){bestM=m;bestU=u;}}
let lo=bestU-2e-7,hi=bestU+2e-7;for(let k=0;k<40;k++){const m1=lo+(hi-lo)*0.382,m2=lo+(hi-lo)*0.618;if(interiorDev(bc,m1,0,0.8,120)<interiorDev(bc,m2,0,0.8,120))hi=m2;else lo=m1;}
USTAR=(lo+hi)/2;C=v=>NB.surface(S,USTAR,v);
console.log('u_f (line the fit follows, from branch curve first 80%)',USTAR,' worst dev there',interiorDev(bc,USTAR,0,0.8,300).toExponential(2),' dev-curve same region',interiorDev(fits.dev.curve,USTAR,0,0.8,300).toExponential(2));
const fa2=NB.foot(C,p0,0,1,4000),fb2=NB.foot(C,p1,0,1,4000);
console.log('vertices -> followed line: p0',fa2.d.toExponential(3),' p1',fb2.d.toExponential(3));
const out={};
{ const name='dev';console.log('\n['+name+']');out[name]=measure(name,fits.dev.curve);
  // profile of deviation along the dev curve's last 10%
  const f=t=>NB.curve(fits.dev.curve,t);const prof=[];
  for(const t of [0.5,0.8,0.9,0.95,0.98,0.99,0.995,0.999,1])prof.push(t+':'+NB.foot(C,f(t),0,1,2000).d.toExponential(2));console.log('  dev deviation vs param t:',prof.join('  '));
  const kn=fits.dev.curve.knots;console.log('  last knots',kn.slice(-8).map(x=>+x.toFixed(5)).join(','));
  // controls
  for(const [lbl,sh] of [['1e-8',1e-8],['1e-7',1e-7]]){const c=JSON.parse(JSON.stringify(fits.dev.curve));
    const tg=NB.sub(c.ctrl[c.ctrl.length-1],c.ctrl[0]),perp=[-tg[1],tg[0],0],pn=NB.norm(perp);
    c.ctrl=c.ctrl.map(q=>[q[0]+perp[0]/pn*sh,q[1]+perp[1]/pn*sh,q[2]+perp[2]/pn*sh]);
    // translation perpendicular in x-y may not be perpendicular to the iso-line in 3D; report the achieved translation size
    console.log('\n[control] dev curve translated by',lbl,'(perp to chord in xy). Expect max close to (not above) shift plus the dev baseline:');measure('control-'+lbl,c);}
}
console.log('\n[branch]');out.branch=measure('branch',fits.branch.curve);
// worst point report for branch, last-interval check
{const f=t=>NB.curve(fits.branch.curve,t),prof=[];for(const t of [0.5,0.8,0.9,0.95,0.98,0.99,0.995,0.999,1])prof.push(t+':'+NB.foot(C,f(t),0,1,2000).d.toExponential(2));console.log('  branch deviation vs param t:',prof.join('  '));}
