const L=require('./lib'),G=L.G;
const bad=require('./bad8.json').filter(b=>b.d<1e-3);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],nm=a=>Math.hypot(...a);
for(const b of bad){
  const e=G.surfaceEval(L.off,b.foot.u,b.foot.v);
  // 3D residual to offset at foot; plane residual
  const r=nm(sub(b.X,e.p)), pr=L.planeD(b.X);
  // independent: all (u,v) with off(u,v)=X by Gauss-Newton from a grid
  const sols=[];
  for(let i=-6;i<=6;i++)for(let j=0;j<=24;j++){
    let u=b.foot.u+i*8,v=40+j*3.5;
    for(let it=0;it<40;it++){const q=G.surfaceEval(L.off,u,v),R=sub(b.X,q.p);
      const a=q.du[0]**2+q.du[1]**2+q.du[2]**2,bb=q.du[0]*q.dv[0]+q.du[1]*q.dv[1]+q.du[2]*q.dv[2],c=q.dv[0]**2+q.dv[1]**2+q.dv[2]**2;
      const x=R[0]*q.du[0]+R[1]*q.du[1]+R[2]*q.du[2],y=R[0]*q.dv[0]+R[1]*q.dv[1]+R[2]*q.dv[2],det=a*c-bb*bb;if(!det)break;
      const su=(c*x-bb*y)/det,sv=(a*y-bb*x)/det;u+=su;v+=sv;if(Math.abs(su)+Math.abs(sv)<1e-12)break;}
    const q=G.surfaceEval(L.off,u,v);if(nm(sub(b.X,q.p))<1e-9&&!sols.some(s=>Math.hypot(s[0]-u,s[1]-v)<1e-3))sols.push([u,v]);}
  console.log(b.x.toFixed(5),'dev',(b.d*1e6).toFixed(1)+'um','|X-off(foot)|',r.toExponential(1),'plane',pr.toExponential(1),'preimages on off:',sols.map(s=>`(${s[0].toFixed(3)},${s[1].toFixed(3)})`).join(' '));
}
