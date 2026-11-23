const N=require('./nurbs'),{surf,dist,curvePt,foot}=N;const d=require('../e844-capture.json');const S=d.c.surface;
const res={};
for(const [name,R] of [['dev','/home/user/conv-dev'],['branch','/home/user/solidworks-converters']]){
  const F=require(R+'/src/brep/fit');const r=F.edgeCurve({id:844,tolerance:2e-5,sameSense:d.sameSense},d.c,d.p0,d.p1,{tolerance:1e-8});res[name]=r;}
// own section row at u: continuous nearest of q on row (golden search over v)
const row=(u,v)=>surf(S,u,v);
function dRow(u,q){let best=0,bd=1e9;for(let j=0;j<=400;j++){const x=dist(row(u,j/400),q);if(x<bd){bd=x;best=j/400;}}
  let a=Math.max(0,best-1/400),z=Math.min(1,best+1/400);for(let k=0;k<80;k++){const m1=a+(z-a)*.382,m2=a+(z-a)*.618;if(dist(row(u,m1),q)<dist(row(u,m2),q))z=m2;else a=m1;}return dist(row(u,(a+z)/2),q);}
// scan u
const u0=0.98076923291805,u1=0.98075906169833;
console.log('dS/du magnitude near section (m per unit u):',dist(surf(S,u0,.5),surf(S,u0+1e-6,.5))/1e-6);
let best={m:1e9};const rows=[];
for(let i=-5;i<=25;i++){const u=u1+(u0-u1)*i/20,a=dRow(u,d.p0),b=dRow(u,d.p1);rows.push([u,a,b]);const m=Math.max(a,b);if(m<best.m)best={m,u,a,b};}
console.log('u, d(p0,row), d(p1,row):');for(const x of rows.filter((_,i)=>i%5==0))console.log(x.map(y=>y.toPrecision(10)).join('  '));
console.log('best minimax u',best,' (control: exact on-row point gives',dRow(u0,surf(S,u0,.37)),')');
// dev curve: u deviation along curve
for(const name of ['dev','branch']){const C=res[name].curve,k0=C.knots[C.degree],k1=C.knots[C.knots.length-C.degree-1];let seed=[u0,0];const out=[];
  for(let i=0;i<=40;i++){const t=k0+(k1-k0)*i/40,p=curvePt(C,t);const f=foot(S,p,seed);seed=[f.u,f.v];out.push([i/40,f.u,f.v]);}
  console.log(name,'u(t) per 1/40: ',out.filter((_,i)=>i%4==0||i>=36).map(x=>x[0].toFixed(3)+':'+((x[1]-0.9807691032)*1e5).toFixed(2)+'e-5@v'+x[2].toFixed(3)).join(' '));}
