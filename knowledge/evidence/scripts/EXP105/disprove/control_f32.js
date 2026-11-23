// Control: points exactly on a cylinder/cone in double, rounded to float32 (as the display stores them).
// Residual is measured with the same closed forms. Must be ~1e-16 in double and ~ulp-sized in float32.
const L=require('./lib');
function rng(s){return()=>(s=(s*1664525+1013904223)>>>0)/4294967296;}
for(const off of [0,0.01,0.05,0.1,0.3,1.0]){
  const rnd=rng(7);const cyl={type:'cylinder',p:[off,off,off],a:[0,0,1],r:0.005},cone={type:'cone',p:[off,off,off],a:[0,0,1],r:0.005,angle:0.3};
  let m={d:[0,0],f:[0,0]};
  for(let i=0;i<20000;i++){const t=rnd()*2*Math.PI,h=rnd()*0.01-0.005;
    [[cyl,0,cyl.r],[cone,1,cone.r+h*Math.tan(cone.angle)]].forEach(([s,k,rho])=>{
      const p=[s.p[0]+rho*Math.cos(t),s.p[1]+rho*Math.sin(t),s.p[2]+h];
      const pf=p.map(Math.fround);
      m.d[k]=Math.max(m.d[k],Math.abs(L.dSurf(s,p)));m.f[k]=Math.max(m.f[k],Math.abs(L.dSurf(s,pf)));});}
  console.log('offset',off,'m  double max cyl/cone',m.d.map(x=>x.toExponential(1)).join(' / '),' float32 max cyl/cone',m.f.map(x=>x.toExponential(1)).join(' / '));
}
