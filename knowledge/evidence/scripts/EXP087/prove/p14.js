const L=require('./lib'),G=L.G;
const sub=(a,c)=>[a[0]-c[0],a[1]-c[1],a[2]-c[2]],nm=a=>Math.hypot(...a);
for(const x of [-0.0455,-0.0470,-0.0481,-0.03,-0.01,0.01]){
  const m=L.solve(x,-13.2,x<-0.0451?77:60); if(!m){console.log(x,'nosolve');continue}
  let best=1e9,bu,bv;
  for(let u=-70;u<=40;u+=0.75)for(let v=0;v<=140;v+=0.75){
    if(Math.hypot(u-m.u,v-m.v)<12)continue;
    const d=nm(sub(m.p,G.surfaceEval(L.off,u,v).p));if(d<best){best=d;bu=u;bv=v;}}
  console.log(x.toFixed(4),'spine pt (u,v)=',m.u.toFixed(1),m.v.toFixed(1),'nearest other-part of offset (>=12 units away):',best.toFixed(5),'m at',bu,bv);
}
