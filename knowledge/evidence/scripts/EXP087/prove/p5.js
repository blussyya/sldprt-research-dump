const L=require('./lib'),G=L.G;
let cur=L.solve(0.02,-20.3593,29.8235),x=0.02,nx=0.02;
for(;;){const t=L.solve(x-0.0005,cur.u,cur.v);if(!t)break;cur=t;x-=0.0005;}
console.log(x,cur.u,cur.v);
let u=cur.u,v=cur.v;const X=x-0.0005;
for(let it=0;it<8;it++){const e=G.surfaceEval(L.off,u,v);console.log(it,u,v,L.planeD(e.p),e.p[0]-X);
 const n=L.pl.n;const F=[L.planeD(e.p),e.p[0]-X];const J=[[n[0]*e.du[0]+n[1]*e.du[1]+n[2]*e.du[2],n[0]*e.dv[0]+n[1]*e.dv[1]+n[2]*e.dv[2]],[e.du[0],e.dv[0]]];
 const det=J[0][0]*J[1][1]-J[0][1]*J[1][0];console.log(' det',det,'J',J);
 const du=-(J[1][1]*F[0]-J[0][1]*F[1])/det,dv=-(-J[1][0]*F[0]+J[0][0]*F[1])/det;u+=du;v+=dv;}
