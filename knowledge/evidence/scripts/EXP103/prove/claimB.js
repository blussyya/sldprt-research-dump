const NB=require('./nurbs'),EX=require('./exact');
const want=[9821,10371,9931,10129,10349];
const repos={dev:'/home/user/conv-dev',branch:'/home/user/solidworks-converters'};
const ctx={};
for(const k in repos){const {M}=require('./load')(repos[k]);const F=require(repos[k]+'/src/brep/fit');
  const seen=new Set(),found={};
  (function walk(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(o.type==='blend'&&want.includes(o.node)&&!found[o.node])found[o.node]=o;
    for(const x in o){if(x==='ctrl'||x==='knots')continue;walk(o[x]);}});
  const w=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(o.type==='blend'&&want.includes(o.node)&&!found[o.node])found[o.node]=o;for(const x in o){if(x==='ctrl'||x==='knots'||x==='chart')continue;w(o[x]);}};
  for(const f of M.faces.values())w(f);for(const e of M.edges.values())w(e);
  ctx[k]={F,found};}
const only=process.argv[2]?process.argv[2].split(',').map(Number):want;
const SAMP=+process.env.SAMP||12;
const out=[];
for(const id of only){
  const res={};
  for(const k in repos){const t0=Date.now(),b=ctx[k].found[id],r=ctx[k].F.spineOf(b,1e-8);res[k]=r;console.log(`${id} ${k}: reported error ${r.error.toExponential(3)}  ctrl=${r.curve.ctrl.length} (${Date.now()-t0}ms) type ${r.curve.type} deg ${r.curve.degree}`);}
  // curve equality dev vs branch, own eval
  const a=res.dev.curve,b=res.branch.curve;let same=a.ctrl.length===b.ctrl.length;let md=0;
  { const lo=a.knots[a.degree],hi=a.knots[a.ctrl.length],lo2=b.knots[b.degree],hi2=b.knots[b.ctrl.length];
    for(let i=0;i<=4000;i++){const t=lo+(hi-lo)*i/4000,t2=lo2+(hi2-lo2)*i/4000;md=Math.max(md,NB.dist(NB.curve(a,t),NB.curve(b,t2)));}}
  console.log(`  dev vs branch curve: ctrl ${a.ctrl.length}/${b.ctrl.length}, max pointwise diff over 4001 samples ${md.toExponential(2)}`);
  // exact spine functions built from dev's raw surfaces
  const bd=ctx.dev.found[id],nested=S=>ctx.dev.F.spineOf(S,1e-10).curve;
  const [S1,S2]=bd.spine.surfaces,g1=EX.mkG(S1,nested),g2=EX.mkG(S2,nested);
  const meas=(curve,label,shift)=>{const kn=curve.knots,deg=curve.degree,n=curve.ctrl.length;
    const dk=[...new Set(kn.slice(deg,n+1))];const rows=[];let maxres=0;
    for(let i=0;i<dk.length-1;i++){
      for(let s=0;s<SAMP;s++){const t=dk[i]+(dk[i+1]-dk[i])*(s+0.5)/SAMP,X=NB.curve(curve,t),h=1e-7*(dk[i+1]-dk[i])+1e-9,T=EX.sub(NB.curve(curve,t+h),NB.curve(curve,t-h));
        let Xs=X;if(shift){const Tn=EX.unit(T),p=EX.unit(EX.cross(Tn,[0.3,0.5,0.8]));Xs=EX.add(X,EX.mul(p,shift));}
        const r=EX.trueDist(g1,g2,Xs,T),sin=EX.cross(EX.unit(EX.grad(g1,r.Y)),EX.unit(EX.grad(g2,r.Y)));
        maxres=Math.max(maxres,r.res);rows.push({t,i,d:r.d,sin:Math.hypot(...sin)});}}
    const mx=a=>a.reduce((p,q)=>q.d>p.d?q:p,{d:-1});
    const good=rows.filter(r=>r.sin>=0.01),all=mx(rows),gm=mx(good),bad=rows.filter(r=>r.sin<0.01);
    console.log(`  [${label}] ${rows.length} samples. max true distance, well-conditioned (sin(angle between surfaces)>=0.01, n=${good.length}): ${gm.d.toExponential(3)} at t=${gm.t.toFixed(6)} (interval ${gm.i}), sin=${gm.sin.toFixed(3)}`);
    console.log(`     ill-conditioned samples (sin<0.01): ${bad.length}${bad.length?`, t in [${Math.min(...bad.map(r=>r.t)).toFixed(6)},${Math.max(...bad.map(r=>r.t)).toFixed(6)}], max d ${mx(bad).d.toExponential(2)}, min sin ${Math.min(...bad.map(r=>r.sin)).toExponential(2)}`:''}; overall max ${all.d.toExponential(3)} at t=${all.t.toFixed(6)}; worst |g| ${maxres.toExponential(1)}`);
    const top=[...rows].sort((p,q)=>q.d-p.d).slice(0,3).map(r=>`t=${r.t.toFixed(5)} d=${r.d.toExponential(2)} sin=${r.sin.toExponential(1)}`);console.log('     top3:',top.join(' | '));
    return {m:gm.d,all:all.d,rows};};
  const t1=Date.now();
  const rd=md>1e-12?meas(res.dev.curve,'dev  '):{m:NaN,all:NaN};if(md<=1e-12)console.log('  dev curve == branch curve to <1e-12, measured once (branch)');
  const rb=meas(res.branch.curve,'branch');console.log(`  (${Date.now()-t1}ms)`);
  if(process.env.CONTROL){meas(res.branch.curve,'control: branch shifted 1e-8',1e-8);meas(res.branch.curve,'control: branch shifted 3e-8',3e-8);}
  out.push({id,dev:rd.m,branch:rb.m});
}
console.log(JSON.stringify(out));
