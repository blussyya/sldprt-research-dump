// run edge 844 capture through edgeCurve on a repo; print result + independent measurement
const R=process.argv[2],F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const d=require('../e844-capture.json');
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const e={id:844,tolerance:2e-5,sameSense:d.sameSense};
const t0=Date.now();
const r=F.edgeCurve(e,d.c,d.p0,d.p1,{tolerance:1e-8});
console.log('time',Date.now()-t0,'keys',Object.keys(r),'err',r.error,'t0,t1',r.t0,r.t1);
const cv=r.curve;
console.log('end0-p0',dist(G.curvePoint(cv,r.t0),d.p0),'end1-p1',dist(G.curvePoint(cv,r.t1),d.p1),'ctrl',cv.ctrl.length);
// independent: sample the SP curve itself densely (the surface image of its 2D curve)
const [a,b]=G.curveRange(d.c);
let tt=[];console.log('spcurve range',a,b,'proj p0',G.curveProject(d.c,d.p0),'p1',G.curveProject(d.c,d.p1));
module.exports={r,d};
