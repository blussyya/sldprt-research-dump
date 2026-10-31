const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const {readBrep}=require(R+'/src');const nat=require(R+'/src/brep/native');
const {ev,foot,range,dist}=require('./bs.js');
const files=require('fs').readFileSync('files2.txt','utf8').trim().split('\n');
const isB=s=>s&&s.type==='bspline'&&s.ctrl&&!s.uPeriodic&&!s.vPeriodic&&!s.uClosed&&!s.vClosed;
function walk(root,visit){const seen=new Set();(function w(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
  if(Array.isArray(o)){if(o.length<50||typeof o[0]==='object')for(const x of o)if(typeof x==='object')w(x);return;}
  visit(o);for(const k of Object.keys(o)){if(k==='ctrl'||k==='weights'||k==='chart'||k==='ku'||k==='kv')continue;w(o[k]);}})(root);}
function resolve(s){let d=0,n=0;while(s&&s.type==='offset'&&n<3){d+=s.d;s=s.basis;n++;}return isB(s)?{S:s,d:Math.abs(d)}:null;}
const T=1e-6; // 1 micron
for(const f of files){
  let m;try{m=nat.build(readBrep(f).parsed);}catch(e){console.log('ERR',f.split('/').pop(),String(e.message).slice(0,60));continue;}
  const curves=new Set(),surfs=new Set();
  walk({faces:m.faces,edges:[...m.edges.values()]},o=>{if(o.type==='intersection')curves.add(o);if(isB(o))surfs.add(o);});
  let nb=surfs.size,np=0,flag=0;
  for(const c of curves){
    c.surfaces.forEach((s0,si)=>{const r=resolve(s0);if(!r)return;
      c.chart.forEach((P,pi)=>{np++;
        const fc=foot(r.S,P,'clamp');const res=fc.d-r.d;
        if(Math.abs(res)<T)return;
        const rg=range(r.S);
        const ft=foot(r.S,P,'tan'),fq=foot(r.S,P,'poly');
        flag++;console.log('CHART',f.split('/').pop(),'curve',c.node,'surf',r.S.node,'d',r.d,'pt',pi+'/'+c.chart.length,'clamp',(res*1e6).toFixed(1),'poly',((fq.d-r.d)*1e6).toFixed(1),'tan',((ft.d-r.d)*1e6).toFixed(1),'um','uv',ft.u.toFixed(2),ft.v.toFixed(2),'rng',[rg.u0,rg.u1,rg.v0,rg.v1].map(x=>x.toFixed(1)).join(','));
      });});
  }
  // vertices on faces with direct bspline surfaces
  for(const fc of m.faces){if(!isB(fc.surface))continue;const S=fc.surface;const vs=new Set();
    for(const l of fc.loops)for(const co of l.coedges){const e=m.edges.get(co.edge);if(e&&e.v)e.v.forEach(v=>vs.add(v));} if(fc.loops.length&&fc.loops.some(l=>l.vertex))for(const l of fc.loops)if(l.vertex)vs.add(l.vertex);
    for(const id of vs){const v=m.vertices.get(id);if(!v)continue;np++;const f1=foot(S,v.p,'clamp');if(f1.d<Math.max(T,v.tolerance||0))continue;
      const ft=foot(S,v.p,'tan'),fq=foot(S,v.p,'poly');flag++;
      console.log('VERT',f.split('/').pop(),'face',fc.id,'surf',S.node,'v',id,'tol',v.tolerance,'clamp',(f1.d*1e6).toFixed(1),'poly',(fq.d*1e6).toFixed(1),'tan',(ft.d*1e6).toFixed(1),'um');}}
  console.log('FILE',f.split('/').pop(),'bsurf',nb,'pts',np,'flagged',flag);
}
