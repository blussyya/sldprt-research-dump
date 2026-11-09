// EXP-105: off-surface vertices that lie on no chord of two other vertices: per-face counts, and whether
// each lies inside a triangle (flat) formed by three other vertices of the face. usage: node unexplained.js part
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2];const d=S.parse(f0),nat=N.build(S.readBrep(f0).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dc={};for(const f of d.faces)if(f.metadata)dc[f.metadata.rawId]=(dc[f.metadata.rawId]||0)+1;
const rows=[];
for(const f of d.faces){const m=f.metadata;if(!m||(m.typeTag!==4002&&m.typeTag!==4003)||dc[m.rawId]>1)continue;
 const nf=nat.faces.find(x=>x.id===m.rawId);if(!nf)continue;const s=nf.surface;if(s.type!=='cylinder'&&s.type!=='cone')continue;
 const v=f.vertices,n=f.vertexCount,P=[];
 for(let i=0;i<n;i++){const p=[v[3*i],v[3*i+1],v[3*i+2]],q=sub(p,s.p),h=dot(q,s.a);
  const rad=Math.hypot(q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h),tgt=s.type==='cone'?s.r+h*Math.tan(s.angle):s.r;P.push({p,err:Math.abs(rad-tgt),i});}
 const T=f.triangleIndices;let un=0,offc=0,maxun=0;const tris=[];for(let i=0;i<T.length;i+=3)tris.push([T[i],T[i+1],T[i+2]]);
 for(const o of P){if(o.err<1e-9)continue;offc++;let ok=false;
  for(let i=0;i<P.length&&!ok;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j];if(a===o||b===o)continue;const ab=sub(b.p,a.p),t=dot(sub(o.p,a.p),ab)/dot(ab,ab);if(t<-1e-9||t>1+1e-9)continue;
   const c=[a.p[0]+ab[0]*t,a.p[1]+ab[1]*t,a.p[2]+ab[2]*t];if(Math.hypot(...sub(o.p,c))<1e-9){ok=true;break;}}
  if(!ok){un++;maxun=Math.max(maxun,o.err);}}
 if(un)rows.push({id:m.rawId,type:s.type,r:s.r,n,off:offc,unexplained:un,maxUnexplained:maxun,nTri:tris.length});}
console.log(JSON.stringify(rows.sort((a,b)=>b.unexplained-a.unexplained).slice(0,12),null,0));console.log('faces with unexplained',rows.length);
