// Ambiguous ids in 2025/2026 files: how many native candidates, how many survive the tag, how many survive geometry.
const L=require('./lib'),R=require('./rec');
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],nrm=a=>Math.hypot(...a);
const perp=(q,a)=>{const h=dot(q,a);return [q[0]-a[0]*h,q[1]-a[1]*h,q[2]-a[2]*h];};
function resid(s,p){switch(s.type){
  case 'plane':return dot(sub(p,s.p),s.n);
  case 'cylinder':return nrm(perp(sub(p,s.p),s.a))-s.r;
  case 'cone':{const q=sub(p,s.p),rho=nrm(perp(q,s.a));return (rho-(s.r+dot(q,s.a)*Math.tan(s.angle)))*Math.cos(s.angle);}
  case 'sphere':return nrm(sub(p,s.c))-s.r;
  case 'torus':{const q=sub(p,s.c),rad=perp(q,s.a),rho=nrm(rad);if(!rho)return NaN;return nrm(sub(q,rad.map(x=>x*s.R/rho)))-s.r;}}
  return null;}
function maxRes(s,v){let m=0;for(let i=0;i<v.length;i+=3){const r=resid(s,[v[i],v[i+1],v[i+2]]);if(r===null)return null;if(!Number.isFinite(r))return Infinity;m=Math.max(m,Math.abs(r));}return m;}
const T={4001:'plane',4002:'cylinder',4003:'cone',4004:'sphere',4005:'torus',4006:'bspline',4007:'blend',4008:'offset',4009:'swept',4010:'spun'};
const files=process.argv.slice(2);
for(const f of files){
  const x=L.dlBytes(f),r=L.faces(x.dl),m=L.mk(x.dl);
  const M=L.S.brep.model(L.S.readBrep(f).parsed);
  const byId=new Map();for(const nf of M.faces){(byId.get(nf.displayId)||byId.set(nf.displayId,[]).get(nf.displayId)).push(nf);}
  const dispIds=new Map();
  const st={disp:r.faces.length,native:M.faces.length,nativeDupIds:0,dispDupIds:0,multi:0,tagLeavesOne:0,tagLeavesSeveral:0,tagLeavesNone:0,geomOneTrue:0,geomNone:0,geomSeveral:0,geomNA:0,
    nativeBodies:new Set(M.faces.map(n=>n.body)).size};
  for(const [k,v] of byId)if(v.length>1)st.nativeDupIds++;
  const out=[];
  r.faces.forEach((fc,i)=>{const w=R.readFace(m,fc.geometryEnd).w;if(!w||w.err)return;
    dispIds.set(w.id,(dispIds.get(w.id)||0)+1);
    const c=byId.get(w.id)||[];if(c.length<=1)return;st.multi++;
    const tc=c.filter(n=>n.surface.type===T[w.tag]);
    if(tc.length===1)st.tagLeavesOne++;else if(tc.length>1)st.tagLeavesSeveral++;else st.tagLeavesNone++;
    const ok=tc.filter(n=>{const e=maxRes(n.surface,fc.vertices);return e!==null&&e<1e-4;});
    const na=tc.filter(n=>maxRes(n.surface,fc.vertices)===null).length;
    if(na===tc.length)st.geomNA++;else if(ok.length===1)st.geomOneTrue++;else if(ok.length===0)st.geomNone++;else st.geomSeveral++;
    if(out.length<4)out.push({id:w.id,tag:w.tag,cands:c.map(n=>n.surface.type+'/b'+n.body)});
  });
  for(const v of dispIds.values())if(v>1)st.dispDupIds++;
  st.nativeBodies=st.nativeBodies;
  console.log(f.split('/').pop(),JSON.stringify(st),JSON.stringify(out));
}
