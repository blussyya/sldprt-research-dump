// Own join of the id/tag block to native faces, with controls. Writes per-face rows to scratchpad.
const fs=require('fs');const L=require('./lib'),R=require('./rec');
const OUT='/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/join.json';
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
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
const rows=[];
for(const f of L.listFiles()){
  let x;try{x=L.dlBytes(f);}catch(e){continue;}if(!x.dl)continue;
  const r=L.faces(x.dl),m=L.mk(x.dl);
  let M=null,err=null;
  try{M=L.S.brep.model(L.S.readBrep(f).parsed);}catch(e){err=e.message;}
  const rel=f.replace(L.ROOT+'/','');
  const disp=[];
  r.faces.forEach((fc,i)=>{const rf=R.readFace(m,fc.geometryEnd);
    if(rf.w&&!rf.w.err&&rf.w.res.every(v=>v===0)&&rf.w.tag>=4001&&rf.w.tag<=4010)disp.push({i,lay:rf.lay,id:rf.w.id,tag:rf.w.tag,fc});
    else disp.push({i,lay:rf.lay,id:null,fc});});
  const byId=new Map();if(M)for(const nf of M.faces){const k=nf.displayId;if(!byId.has(k))byId.set(k,[]);byId.get(k).push(nf);}
  const withId=disp.filter(d=>d.id!==null);
  disp.forEach(d=>{
    const row={file:rel,ver:x.ver,i:d.i,lay:d.lay,id:d.id,tag:d.tag||null,nat:M?M.faces.length:null,err,nDisp:disp.length};
    if(M&&d.id!==null){
      const c=byId.get(d.id)||[];row.ncand=c.length;
      row.ctypes=c.map(n=>n.surface.type);
      if(c.length===1){const s=c[0].surface;row.ntype=s.type;row.res=maxRes(s,d.fc.vertices);}
      // control 1: id of a random other display face (same file)
      const o=withId[Math.floor(rnd()*withId.length)];
      const c2=byId.get(o.id)||[];row.shufNcand=c2.length;row.shufTypes=c2.map(n=>n.surface.type);
      if(c2.length===1&&c2[0].surface){row.shufRes=maxRes(c2[0].surface,d.fc.vertices);}
      // control 2: id shifted
      row.ctrlShift=[1,2,3].map(k=>(byId.get(d.id+k)||[]).length);
      row.nativeMaxId=Math.max(...M.faces.map(n=>n.displayId));
    }
    rows.push(row);
  });
}
fs.writeFileSync(OUT,JSON.stringify(rows));console.log('rows',rows.length);
