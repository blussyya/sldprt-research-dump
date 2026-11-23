const N=require('./nurbs'),{surf,dist,curvePt,foot}=N;const d=require('../e844-capture.json');const S=d.c.surface;
const G=require(process.argv[2]+'/src/geom/eval'),F=require(process.argv[2]+'/src/brep/fit');
const r=F.edgeCurve({id:844,tolerance:2e-5,sameSense:d.sameSense},d.c,d.p0,d.p1,{tolerance:1e-8});
const [k0,k1]=[r.curve.knots[r.curve.degree],r.curve.knots[r.curve.knots.length-r.curve.degree-1]];
// control: own curve eval vs converter's
let m=0;for(let i=0;i<20;i++){const t=k0+(k1-k0)*Math.random();m=Math.max(m,dist(curvePt(r.curve,t),G.curvePoint(r.curve,t)));}console.log('curve eval diff vs converter',m);
const A=foot(S,d.p0,[0.98077,0.0]),B=foot(S,d.p1,[0.98076,0.997]);console.log('uvA',A,'uvB',B);
let uvs=[];const n=200;let sd=0;
for(let i=0;i<=n;i++){const t=k0+(k1-k0)*i/n,p=curvePt(r.curve,t);const f=foot(S,p,i?[uvs[i-1].u,uvs[i-1].v]:[A.u,A.v]);uvs.push(f);sd=Math.max(sd,f.d);}
console.log('curve: max dist to surface',sd,'u range',Math.min(...uvs.map(x=>x.u)),Math.max(...uvs.map(x=>x.u)),'v range',uvs[0].v,uvs[n].v);
console.log('end distances to vertices',dist(curvePt(r.curve,k0),d.p0),dist(curvePt(r.curve,k1),d.p1),'(order may be swapped)');
// distance of the curve to a straight 2D line through uvA,uvB on the surface, and to the iso-u section
function lineDev(uv0,uv1,fn){let mx=0;for(let i=0;i<=n;i++){const t=k0+(k1-k0)*i/n,p=curvePt(r.curve,t);let bd=1e9;
  for(let j=0;j<=2000;j++){const s=j/2000;const dd=dist(fn(s),p);if(dd<bd)bd=dd;}mx=Math.max(mx,bd);}return mx;}
const line=(a,b)=>s=>surf(S,a.u+(b.u-a.u)*s,a.v+(b.v-a.v)*s);
console.log('max dist curve -> sampled 2D straight line A-B (2000 samples)',lineDev(A,B,line(A,B)));
