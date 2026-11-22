// EXP-103 (finish): edge 844 from the capture through the converter's own edgeCurve, with and
// without the edge's tolerance (2e-5 m, from e844tol.out), and the result measured against the
// section reanchor follows (4001 points) and against both vertices.
const R=process.env.CONV||'/home/user/solidworks-converters',F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const {c,p0,p1}=JSON.parse(require('fs').readFileSync(__dirname+'/../e844-capture.json','utf8'));
for(const tolerance of [undefined,1.998001998001998e-5]){
  const r=F.edgeCurve({id:844,sameSense:true,tolerance},c,p0,p1,{tolerance:1e-8});
  const a=G.bsplineCurve(r.curve,r.t0).p,b=G.bsplineCurve(r.curve,r.t1).p;
  console.log('edge tolerance',String(tolerance).padEnd(22),'error',r.error.toExponential(3),'ctrl',r.curve.ctrl.length,'| start to p0',G.dist(a,p0).toExponential(3),'end to p1',G.dist(b,p1).toExponential(3));}
