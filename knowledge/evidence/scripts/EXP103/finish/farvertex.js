// control for the pinned-end gap: a quarter circle on a cylinder, far vertex 1e-4 m off, edge tolerance 2e-5 m
const R=process.argv[2],F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const cyl={type:'cylinder',p:[0,0,0],a:[0,0,1],x:[1,0,0],r:1e-2};
const c={type:'spcurve',surface:cyl,c2:{type:'bspline',degree:1,knots:[0,0,1,1],ctrl:[[0,0.002],[Math.PI/2,0.002]],weights:null}};
const p0=G.curvePoint(c,0),far=G.add(G.curvePoint(c,1),[0,1e-4,0]);
const r=F.edgeCurve({id:1,sameSense:true,tolerance:2e-5},c,p0,far,{tolerance:1e-8});
console.log(R.padEnd(34),'vertex 1e-4 m off, reported error',r.error.toExponential(3));
