// proper deviation of each fitted spcurve edge from the exact SP curve (non-blend), dev vs branch, + vertex gaps vs vertex tolerances
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);const dist=G.dist;
const a=require('./c2-dev.json'),b=require('./c2-branch.json');
// re-run edgeCurve per repo to get curves
const fit={dev:require('/home/user/conv-dev/src/brep/fit'),br:require('/home/user/solidworks-converters/src/brep/fit')};
function proj(cc,q,a,b){const n=6000;let best=a,bd=1e9;for(let i=0;i<=n;i++){const t=a+(b-a)*i/n,d=dist(G.curvePoint(cc,t),q);if(d<bd){bd=d;best=t;}}
  let lo=Math.max(a,best-(b-a)/n),hi=Math.min(b,best+(b-a)/n);for(let k=0;k<70;k++){const m1=lo+(hi-lo)*.382,m2=lo+(hi-lo)*.618;if(dist(G.curvePoint(cc,m1),q)<dist(G.curvePoint(cc,m2),q))hi=m2;else lo=m1;}
  return dist(G.curvePoint(cc,(lo+hi)/2),q);}
const rows=[];
for(const e of M.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;if(c.type!=='spcurve'||c.surface.type==='blend')continue;
  const p0=M.vertices.get(e.v[0]),p1=M.vertices.get(e.v[1]);const rec={id:e.id,etol:e.tolerance,vtol:[p0.tolerance,p1.tolerance]};
  for(const k of ['dev','br']){const r=fit[k].edgeCurve(e,c,p0.p,p1.p,{tolerance:1e-8});const [x,y]=G.curveRange(c);let mx=0;
    for(let i=0;i<=200;i++)mx=Math.max(mx,proj(c,G.curvePoint(r.curve,Math.min(r.t0,r.t1)+Math.abs(r.t1-r.t0)*i/200),x,y));
    rec[k]={err:r.error,true:mx,g0:dist(G.curvePoint(r.curve,r.t0),p0.p),g1:dist(G.curvePoint(r.curve,r.t1),p1.p)};}
  // control: how far the vertices are from the SP curve itself
  const [x,y]=G.curveRange(c);rec.vdist=[proj(c,p0.p,x,y),proj(c,p1.p,x,y)];rows.push(rec);}
require('fs').writeFileSync('c3.json',JSON.stringify(rows,null,1));
const F=v=>v.toExponential(1);
console.log('id etol vtol | vertex dist to SP | dev: reported, true-dev-from-SP, gaps | br: reported, true, gaps');
for(const r of rows){if(Math.abs(r.dev.true-r.br.true)>1e-9||Math.max(r.br.g0,r.br.g1)>1e-8)console.log(r.id,F(r.etol),r.vtol.map(F).join('/'),'|',r.vdist.map(F).join('/'),'|',[r.dev.err,r.dev.true,r.dev.g0,r.dev.g1].map(F).join(' '),'|',[r.br.err,r.br.true,r.br.g0,r.br.g1].map(F).join(' '));}
console.log('worst true deviation dev',F(Math.max(...rows.map(r=>r.dev.true))),'branch',F(Math.max(...rows.map(r=>r.br.true))));
