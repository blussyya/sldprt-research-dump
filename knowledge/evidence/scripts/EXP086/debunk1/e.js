const R='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters';
const fs=require('fs');const {readBrep}=require(R+'/src');const native=require(R+'/src/brep/native');const E=require(R+'/src/geom/eval');
const D='/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/sldprt-research-dump/';
const files=[];
for(const d of fs.readdirSync(D+'test files online')){const p=D+'test files online/'+d;if(!fs.statSync(p).isDirectory())continue;for(const f of fs.readdirSync(p))if(/\.sldprt$/i.test(f))files.push(p+'/'+f);}
function walk(p,dp){if(dp>3)return;let st;try{st=fs.readdirSync(p,{withFileTypes:true});}catch(e){return;}for(const e of st){const q=p+'/'+e.name;if(e.isDirectory())walk(q,dp+1);else if(/\.sldprt$/i.test(e.name))files.push(q);}}
walk(D+'test files new',0);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const res=[];
function test(S,pts){const B=S.basis;const v=[];let oor=0,resid=0;
  for(const p of pts){const r=E.surfaceInverse(B,p);const e=E.surfaceEval(B,r.u,r.v);const n=cr(e.du,e.dv);const L=Math.hypot(...n);if(!L)continue;
    const q=sub(p,e.p);const s=dot(q,n)/L;v.push(s);resid=Math.max(resid,Math.hypot(...q)-Math.abs(s));
    if(B.type==='bspline'){const [[u0,u1],[v0,v1]]=E.surfaceRange(B);const w=(B.uPeriodic||B.uClosed),w2=(B.vPeriodic||B.vClosed);if((!w&&(r.u<=u0+1e-9||r.u>=u1-1e-9))||(!w2&&(r.v<=v0+1e-9||r.v>=v1-1e-9)))oor++;}}
  return {v,oor,resid};}
for(const f of files){let m;try{m=native.build(readBrep(f).parsed);}catch(e){continue;}
  const per=new Map();
  const add=(S,pts,src)=>{if(S.type!=='offset')return;const k=S.node;if(!per.has(k))per.set(k,{S,face:[],ic:[]});per.get(k)[src].push(...pts);};
  for(const fc of m.faces){if(fc.surface.type!=='offset')continue;const pts=[];
    for(const l of fc.loops)for(const c of l.coedges){const e=m.edges.get(c.edge);if(e&&e.v)for(const vid of e.v){const V=m.vertices.get(vid);if(V)pts.push(V.p);}}
    add(fc.surface,pts,'face');}
  const seen=new Set();
  for(const e of m.edges.values()){let c=e.curve;if(c&&c.type==='trimmed')c=c.basis;if(c&&c.type==='intersection'&&!seen.has(c)){seen.add(c);c.surfaces.forEach(S=>add(S,c.chart,'ic'));}}
  for(const [k,o] of per){const S=o.S;const rec={f:f.replace(D,''),node:k,bt:S.basis.type,d:S.d,os:S.sense,bs:S.basis.sense};
    for(const src of ['face','ic']){if(!o[src].length){rec[src]=null;continue;}
      try{const t=test(S,o[src]);const pred=S.d*S.basis.sense;const tol=1e-5+1e-3*Math.abs(S.d);
        let ok=0,flip=0,other=0;for(const s of t.v){if(Math.abs(s-pred)<tol)ok++;else if(Math.abs(s+pred)<tol)flip++;else other++;}
        rec[src]={n:t.v.length,ok,flip,other,oor:t.oor,resid:t.resid};}catch(e){rec[src]='err '+e.message.slice(0,40);}}
    res.push(rec);}
}
fs.writeFileSync('res_e.json',JSON.stringify(res));console.log(res.length);
