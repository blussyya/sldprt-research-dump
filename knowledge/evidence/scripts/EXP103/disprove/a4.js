const N=require('./nurbs'),{surf,dist,curvePt,foot}=N;const d=require('../e844-capture.json');
const S12=require('./surf-2312-2308.json')[2312],S08=require('./surf-2312-2308.json')[2308];
const out={};
for(const [name,R] of [['dev','/home/user/conv-dev'],['branch','/home/user/solidworks-converters']]){
  const F=require(R+'/src/brep/fit');const r=F.edgeCurve({id:844,tolerance:2e-5,sameSense:d.sameSense},d.c,d.p0,d.p1,{tolerance:1e-8});
  const C=r.curve,k0=C.knots[C.degree],k1=C.knots[C.knots.length-C.degree-1];out[name]={C,k0,k1};}
// seed for 2308 foot: global grid
function gfoot(S,q){let best=[0,0],bd=1e9;for(let i=0;i<=600;i++)for(let j=0;j<=20;j++){const x=dist(surf(S,i/600,j/20),q);if(x<bd){bd=x;best=[i/600,j/20];}}return foot(S,q,best);}
for(const [n,q] of [['p0 (v1398)',d.p0],['p1 (v1270)',d.p1]])console.log(n,'dist to S2312',gfoot(S12,q).d,'to S2308',gfoot(S08,q).d,'uv08',JSON.stringify(gfoot(S08,q)));
console.log('control: a point on S2308 at (.5,.5) ->',gfoot(S08,surf(S08,.5,.5)).d);
for(const name of ['dev','branch']){const {C,k0,k1}=out[name];let m12=0,m08=0,a12,a08;const n=100;let seed12=null,seed08=null;const prof=[];
  for(let i=0;i<=n;i++){const t=k0+(k1-k0)*i/n,p=curvePt(C,t);const f1=i?foot(S12,p,[seed12.u,seed12.v]):gfoot(S12,p),f2=i?foot(S08,p,[seed08.u,seed08.v]):gfoot(S08,p);seed12=f1;seed08=f2;
    if(f1.d>m12){m12=f1.d;}if(f2.d>m08){m08=f2.d;}prof.push([i/n,f1.d,f2.d]);}
  console.log(name,'max dist to S2312',m12,'max dist to S2308',m08);
  console.log('  profile t,d12,d08 at ends:',prof.slice(0,3).map(x=>x.map(y=>+y.toPrecision(3))).join(' | '),' ... ',prof.slice(-4).map(x=>x.map(y=>+y.toPrecision(3))).join(' | '));}
