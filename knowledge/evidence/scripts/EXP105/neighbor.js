// EXP-105: do the off-surface vertices coincide with vertices of another display face (shared boundary vertices)?
// usage: node neighbor.js part
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2];const d=S.parse(f0),nat=N.build(S.readBrep(f0).parsed);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const all=[];for(const f of d.faces){const v=f.vertices;for(let i=0;i<f.vertexCount;i++)all.push({f:f.metadata&&f.metadata.rawId,p:[v[3*i],v[3*i+1],v[3*i+2]]});}
let off=0,shared=0,max=0,tot=0;
for(const f of d.faces){const m=f.metadata;if(!m||(m.typeTag!==4002&&m.typeTag!==4003))continue;const nf=nat.faces.find(x=>x.id===m.rawId);if(!nf)continue;const s=nf.surface;if(!s.a||!s.x)continue;
 const v=f.vertices;for(let i=0;i<f.vertexCount;i++){const p=[v[3*i],v[3*i+1],v[3*i+2]],q=sub(p,s.p),h=dot(q,s.a);tot++;
  const rad=Math.hypot(q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h),tgt=s.type==='cone'?s.r+h*Math.tan(s.angle):s.r,e=Math.abs(rad-tgt);if(e<1e-9)continue;off++;
  let hit=false;for(const a of all){if(a.f===m.rawId)continue;if(Math.hypot(...sub(a.p,p))<1e-9){hit=true;break;}}if(hit)shared++;}}
console.log(f0.split('/').slice(-2).join('/'),'cyl/cone verts',tot,'off',off,'coincide with a vertex of another display face (<1e-9 m)',shared);
