// EXP-105: split every cylinder/cone face's vertices into on-surface (<1e-9 m) and off, and test the off ones
// for lying on a straight chord of two on-surface vertices at the any two on-surface vertices (no height constraint). usage: node sweep.js part
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native');
const f0=process.argv[2];const d=S.parse(f0),nat=N.build(S.readBrep(f0).parsed);
const cnt={};for(const f of nat.faces)cnt[f.id]=(cnt[f.id]||0)+1;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const T={faces:0,skippedDupId:0,skippedNoJoin:0,verts:0,on:0,off:0,offOnChord:0,offNoChordCand:0,onMax:0,offMax:0,faceWithOff:0,faceNoOff:0,fracOffMax:0};
const bad=[];const dc={};for(const f of d.faces)if(f.metadata)dc[f.metadata.rawId]=(dc[f.metadata.rawId]||0)+1;
for(const f of d.faces){const m=f.metadata;if(!m||(m.typeTag!==4002&&m.typeTag!==4003))continue;
 const nf=nat.faces.find(x=>x.id===m.rawId);if(!nf){T.skippedNoJoin++;bad.push(['nojoin',m.rawId]);continue;}
 if(cnt[m.rawId]>1||dc[m.rawId]>1){T.skippedDupId++;bad.push(['dupid',m.rawId]);continue;}
 const s=nf.surface;if(s.type!=='cylinder'&&s.type!=='cone'){bad.push(['type',m.rawId,s.type]);continue;}
 T.faces++;const v=f.vertices,n=f.vertexCount,P=[];
 for(let i=0;i<n;i++){const p=[v[3*i],v[3*i+1],v[3*i+2]],q=sub(p,s.p),h=dot(q,s.a);
  const rad=Math.hypot(q[0]-s.a[0]*h,q[1]-s.a[1]*h,q[2]-s.a[2]*h),tgt=s.type==='cone'?s.r+h*Math.tan(s.angle):s.r;
  P.push({p,h,err:Math.abs(rad-tgt)});}
 const on=P.filter(a=>a.err<1e-9),off=P.filter(a=>a.err>=1e-9);
 T.verts+=n;T.on+=on.length;T.off+=off.length;off.length?T.faceWithOff++:T.faceNoOff++;
 for(const a of on)T.onMax=Math.max(T.onMax,a.err);for(const a of off){T.offMax=Math.max(T.offMax,a.err);}
 if(off.length)T.fracOffMax=Math.max(T.fracOffMax,off.length/n);
 for(const o of off){let ok=false,cand=false;
  for(let i=0;i<on.length&&!ok;i++)for(let j=i+1;j<on.length;j++){const a=on[i],b=on[j];cand=true;
   const ab=sub(b.p,a.p),t=dot(sub(o.p,a.p),ab)/dot(ab,ab);if(t<-1e-9||t>1+1e-9)continue;
   const c=[a.p[0]+ab[0]*t,a.p[1]+ab[1]*t,a.p[2]+ab[2]*t];if(Math.hypot(...sub(o.p,c))<1e-9){ok=true;break;}}
  ok?T.offOnChord++:(cand?0:T.offNoChordCand++);}
}
console.log(JSON.stringify({file:f0.split('/').pop(),...T,bad}));
