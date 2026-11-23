const {surf,dist}=require('./nurbs');const d=require('../e844-capture.json');const S=d.c.surface;
// control: eval at a control-net-corner-ish known: compare own eval to converter's eval
const G=require('/home/user/conv-dev/src/geom/eval');
let mx=0;for(let i=0;i<50;i++){const u=Math.random(),v=Math.random();mx=Math.max(mx,dist(surf(S,u,v),G.surfaceEval(S,u,v).p));}
console.log('own vs converter eval max diff',mx);
// true distance of vertices from the surface: global grid then refine (Nelder-Mead-ish by coordinate halving)
function nearest(q){let best=[0,0],bd=1e9;const n=400;
  for(let i=0;i<=n;i++)for(let j=0;j<=40;j++){const dd=dist(surf(S,i/n,j/40),q);if(dd<bd){bd=dd;best=[i/n,j/40];}}
  let h=1/n;for(let k=0;k<60;k++){let imp=false;for(const [du,dv] of [[h,0],[-h,0],[0,h],[-h,h],[0,-h],[h,h],[-h,-h],[h,-h]]){const u=Math.min(1,Math.max(0,best[0]+du)),v=Math.min(1,Math.max(0,best[1]+dv*40/1)),dd=dist(surf(S,u,v),q);if(dd<bd){bd=dd;best=[u,v];imp=true;}}if(!imp)h/=2;}
  return {uv:best,d:bd};}
for(const [n,q] of [['p0',d.p0],['p1',d.p1]]){console.log(n,nearest(q));}
// control: a point exactly on the surface must give ~0
const qc=surf(S,0.3,0.4);console.log('control on-surface',nearest(qc).d);
const qo=surf(S,0.3,0.4).map((x,i)=>x+(i==0?1e-6:0));console.log('control 1e-6 off (expect <=1e-6)',nearest(qo).d);
