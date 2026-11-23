// EXP-105: are the off-surface vertices points on straight chords between on-surface vertices?
// usage: node chord.js part id...   (cylinders: per ring at equal axial height h; cones too)
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2],ids=process.argv.slice(3).map(Number);
const d=S.parse(f0),nat=N.build(S.readBrep(f0).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
for(const id of ids){const f=d.faces.find(f=>f.metadata&&f.metadata.rawId===id),s=nat.faces.find(x=>x.id===id).surface;
 const v=f.vertices,n=f.vertexCount,P=[];
 const y=[s.a[1]*s.x[2]-s.a[2]*s.x[1],s.a[2]*s.x[0]-s.a[0]*s.x[2],s.a[0]*s.x[1]-s.a[1]*s.x[0]];
 for(let i=0;i<n;i++){const p=[v[3*i],v[3*i+1],v[3*i+2]],q=sub(p,s.p),h=dot(q,s.a);
  const rad=Math.hypot(q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h),tgt=s.type==='cone'?s.r+h*Math.tan(s.angle):s.r;
  P.push({p,h,err:rad-tgt,th:Math.atan2(dot(q,y),dot(q,s.x))});}
 const on=P.filter(a=>Math.abs(a.err)<1e-9),off=P.filter(a=>Math.abs(a.err)>=1e-9);
 let res=[];
 for(const o of off){let best=Infinity,bi=null;
  for(let i=0;i<on.length;i++)for(let j=i+1;j<on.length;j++){const a=on[i],b=on[j];if(Math.abs(a.h-b.h)>1e-9*1||Math.abs(a.h-o.h)>1e-9)continue;
   const ab=sub(b.p,a.p),t=dot(sub(o.p,a.p),ab)/dot(ab,ab);if(t<-1e-9||t>1+1e-9)continue;
   const c=[a.p[0]+ab[0]*t,a.p[1]+ab[1]*t,a.p[2]+ab[2]*t],dd=Math.hypot(...sub(o.p,c));if(dd<best){best=dd;bi=[a.th,b.th,t];}}
  res.push({err:o.err,distToChord:best,seg:bi});}
 console.log('face',id,s.type,'verts',n,'on',on.length,'off',off.length);
 for(const r of res.slice(0,8))console.log('  err',r.err.toExponential(2),'dist to nearest chord',r.distToChord.toExponential(2),r.seg&&r.seg.map(x=>x.toFixed(3)).join(','));
 const nc=res.filter(r=>r.distToChord<1e-9).length;console.log('  off vertices lying on a chord of two on-surface vertices (<1e-9 m):',nc,'of',off.length);}
