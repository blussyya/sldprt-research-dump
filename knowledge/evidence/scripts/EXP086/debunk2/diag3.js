const R="/run/media/blus/1F7A-F408/projects/sldprt reverse engineering/solidworks-converters";
const {readBrep}=require(R+'/src');const nat=require(R+'/src/brep/native');const {ev,foot,range,dist}=require('./bs.js');
const f=require('fs').readFileSync('files.txt','utf8').trim().split('\n').find(x=>x.includes('f666f342'));
const m=nat.build(readBrep(f).parsed);
let cur=null;(function w(o,seen=new Set()){if(!o||typeof o!=='object'||seen.has(o)||cur)return;seen.add(o);if(o.type==='intersection'&&o.node===5689){cur=o;return;}for(const k of Object.keys(o)){if(k==='ctrl'||k==='chart')continue;w(o[k],seen);}})([...m.faces,...m.edges.values()]);
const b=cur.surfaces[0].basis;const r=range(b);
for(const model of ['clamp','poly','tan','quad']) for(const i of [3,4,5,6]){const P=cur.chart[i];let best=null;
 // dense local grid around the corner, u in [-0.5,1], v in [r.v0-0.3, r.v0+0.1]
 for(let a=0;a<=400;a++)for(let c=0;c<=300;c++){const u=-0.5+1.5*a/400,v=r.v0-0.3+0.4*c/300;const d=dist(P,ev(b,u,v,model));if(!best||d<best.d)best={u,v,d};}
 let su=1.5/400,sv=0.4/300;for(let it=0;it<200;it++){let imp=false;for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const d=dist(P,ev(b,best.u+x*su,best.v+y*sv,model));if(d<best.d){best={u:best.u+x*su,v:best.v+y*sv,d};imp=true}}if(!imp){su/=2;sv/=2}}
 console.log(model,'pt',i,'res um',((best.d-0.002)*1e6).toFixed(2),'u',best.u.toFixed(4),'v',best.v.toFixed(4),'(v0',r.v0.toFixed(4)+')');}
