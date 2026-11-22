// rule boundary test on edge 844's real input: move vertex p1 by various amounts, see which side of the rule each lands on
const {dist,curvePt}=require('./nurbs');const d=require('../e844-capture.json');
const rng=C=>[C.knots[C.degree],C.knots[C.knots.length-C.degree-1]];
const base=require('/home/user/solidworks-converters/src/brep/fit').edgeCurve({id:844,tolerance:2e-5,sameSense:d.sameSense},d.c,d.p0,d.p1,{tolerance:1e-8});
function toBase(C){const [lo,hi]=rng(C);let m=0;for(let i=0;i<=400;i++){const q=curvePt(C,lo+(hi-lo)*i/400);const [a,b]=rng(base.curve);let bd=1e9,bt=a;for(let j=0;j<=2000;j++){const t=a+(b-a)*j/2000,x=dist(curvePt(base.curve,t),q);if(x<bd){bd=x;bt=t;}}
  let l=Math.max(a,bt-(b-a)/2000),r=Math.min(b,bt+(b-a)/2000);for(let k=0;k<60;k++){const m1=l+(r-l)*.382,m2=l+(r-l)*.618;if(dist(curvePt(base.curve,m1),q)<dist(curvePt(base.curve,m2),q))r=m2;else l=m1;}m=Math.max(m,dist(curvePt(base.curve,(l+r)/2),q));}return m;}
// directions: along the edge chord, and out of surface (approx: perpendicular to chord and to the section tangent)
const ch=[d.p1[0]-d.p0[0],d.p1[1]-d.p0[1],d.p1[2]-d.p0[2]],cn=Math.hypot(...ch),u=ch.map(x=>x/cn);
const mk=(off,dir)=>d.p1.map((x,i)=>x+off*dir[i]);
const n=[u[1]*0+0,0,0];// placeholder
const ex=[1,0,0],cr=[u[1]*ex[2]-u[2]*ex[1],u[2]*ex[0]-u[0]*ex[2],u[0]*ex[1]-u[1]*ex[0]],crn=Math.hypot(...cr),dirN=cr.map(x=>x/crn);
for(const [name,R] of [['dev','/home/user/conv-dev'],['branch','/home/user/solidworks-converters']]){const F=require(R+'/src/brep/fit');
  console.log('==',name);
  for(const [dn,dir] of [['along chord',u],['sideways',dirN]])for(const off of [0,5e-9,5e-8,1e-6,1e-5,1.9e-5,2.1e-5,1e-4]){
    let r,txt;try{r=F.edgeCurve({id:844,tolerance:2e-5,sameSense:d.sameSense},d.c,d.p0,mk(off,dir),{tolerance:1e-8});
      const [a,b]=rng(r.curve);const e1=dist(curvePt(r.curve,r.t1),mk(off,dir));txt='err '+r.error.toExponential(1)+' endgap '+e1.toExponential(1)+' maxdev from branch-baseline '+toBase(r.curve).toExponential(1);}catch(err){txt='THROWS '+err.message.slice(0,60);}
    console.log(dn.padEnd(12),'p1 moved',off.toExponential(0),'->',txt);}}
