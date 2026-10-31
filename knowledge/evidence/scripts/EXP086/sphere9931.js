// head_back blend 9931's spine near its T end: correct points onto blend 9930 ∩ offset 9925 holding
// their distance from the T point (a sphere) instead of a plane normal to the chord, and compare
// with the plane corrector. Each result: distance to both surfaces, distance from the fitted spine.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),f=[...M.faces.values()].find(x=>x.id===9865),b=f.surface;
let c=b.spine;if(c.type==='trimmed')c=c.basis;const [S1,S2]=c.surfaces,B=c.end.p;
const sp=F.spineOf(b,1e-8).curve,[a,z]=G.curveRange(sp),k=F.spineOf(S1,1e-10).curve,r1=Math.abs(S1.range[0]);
const foot1=X=>{const ck=G.curvePoint(k,G.curveProject(k,X).t),v=G.sub(X,ck),n=G.unit(v);return {d:G.norm(v)-r1,n};};
const foot2=X=>{const r=G.surfaceInverse(S2,X),e=G.surfaceEval(S2,r.u,r.v),n=G.unit(G.cross(e.du,e.dv));return {d:G.dot(G.sub(X,e.p),n),n};};
const sphere=(g,rho)=>{let X=g;for(let it=0;it<60;it++){const p=foot1(X),q=foot2(X),u=G.unit(G.sub(X,B)),Fv=[p.d,q.d,G.dist(X,B)-rho],Mx=[p.n,q.n,u];
  const det=G.dot(Mx[0],G.cross(Mx[1],Mx[2]));const c0=G.cross(Mx[1],Mx[2]),c1=G.cross(Mx[2],Mx[0]),c2=G.cross(Mx[0],Mx[1]);
  const D=G.mul(G.add(G.add(G.mul(c0,Fv[0]),G.mul(c1,Fv[1])),G.mul(c2,Fv[2])),-1/det);X=G.add(X,D);if(G.norm(D)<1e-17)break;}return X;};
const nearSp=X=>{let best=1e9;for(let i=0;i<=20000;i++){const t=z-(z-a)*1e-3*i/20000;best=Math.min(best,G.dist(X,G.curvePoint(sp,t)));}return best;};
for(const dt of [1e-4,3e-5,1e-5,3e-6,1e-6,1e-7,1e-8]){const g=G.curvePoint(sp,z-dt),T=G.unit(G.curveTangent(sp,z-dt));
  const Xs=sphere(g,G.dist(g,B));let Xp;try{Xp=F.corrector(S1,S2,g,T,new Map());}catch(e){Xp=null;}
  console.log('1-t',dt.toExponential(0),'from T nm',(G.dist(g,B)*1e9).toFixed(1),'| sphere: moves',G.dist(Xs,g).toExponential(1),'res',Math.max(Math.abs(foot1(Xs).d),Math.abs(foot2(Xs).d)).toExponential(1),'| plane: moves',Xp?G.dist(Xp,g).toExponential(1):'-');}
// the fitted spine's own distance from the T point over its last 1e-3 of parameter, and its knots there
const row=[];for(const dt of [1e-3,5e-4,2e-4,1e-4,5e-5,3e-5,2e-5,1e-5,5e-6,2e-6,1e-6,0])row.push(dt.toExponential(0)+':'+(G.dist(G.curvePoint(sp,z-dt),B)*1e9).toFixed(0));
console.log('1-t : nm from T  ',row.join('  '));
console.log('last knots',sp.knots.slice(-10).map(x=>(1-x).toExponential(2)).join(' '),'ctrl',sp.ctrl.length);
