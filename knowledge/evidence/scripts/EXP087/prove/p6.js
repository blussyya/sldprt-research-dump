const L=require('./lib');
// continuation main branch
let cur=L.solve(0.02,-20.3593,29.8235);const main=[];
for(let x=0.02;x>-0.0485;x-=0.0005){cur=L.solve(x,cur.u,cur.v);main.push({x,...cur});}
const at=x=>main[Math.round((0.02-x)/0.0005)];
for(const x of [0.02,0.015,0.01,0,-0.01,-0.02,-0.03,-0.036,-0.04,-0.042,-0.044,-0.046,-0.048]){
  const m=at(x); const sols=[];
  const n=40,R=45;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
    const r=L.solve(x,m.u-R+2*R*i/n,m.v-R+2*R*j/n); if(!r)continue;
    if(!sols.some(o=>Math.hypot(...[0,1,2].map(k=>o.p[k]-r.p[k]))<1e-9))sols.push(r);}
  console.log(x.toFixed(4),'main',m.u.toFixed(2),m.v.toFixed(2),'|',sols.map(o=>`(${o.u.toFixed(2)},${o.v.toFixed(2)}) dy=${((o.p[1]-m.p[1])*1e6).toFixed(1)}um dz=${((o.p[2]-m.p[2])*1e6).toFixed(1)}um`).join(' | '));
}
