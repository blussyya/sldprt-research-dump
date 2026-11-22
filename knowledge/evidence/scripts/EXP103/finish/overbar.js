// EXP-103 (finish): the fitted edges of a part that are over the bar, with what bounds them: curve
// type, the edge's tolerance, its vertices' tolerances, and how far each vertex is from the exact
// curve (the fit's curve with that end left free, i.e. fitted with tolerance on the edge).
// usage: CONV=<repo> node overbar.js <part>
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),rows=[];
const em=F.edgeCurve;F.edgeCurve=function(e,c,p0,p1,o){const r=em.call(this,e,c,p0,p1,o);if(r&&r.error>1e-8)rows.push({e,c,p0,p1,r});return r;};
P.resolve(M);
console.log(require('path').basename(process.argv[2]),'| fitted edges over 1e-8 m:',rows.length);
for(const {e,c,p0,p1,r} of rows.sort((a,b)=>b.r.error-a.r.error).slice(0,12)){
  const vt=(e.v||[]).map(v=>M.vertices.get(v).tolerance);
  const a=G.bsplineCurve(r.curve,r.t0).p,b=G.bsplineCurve(r.curve,r.t1).p;
  // the exact curve's points nearest each vertex: refit with a huge edge tolerance so both ends are free
  let gaps='n/a';try{const free=em.call(F,{...e,tolerance:1},c,p0,p1,{tolerance:1e-8});const fa=G.bsplineCurve(free.curve,free.t0).p,fb=G.bsplineCurve(free.curve,free.t1).p;
    gaps=[G.dist(fa,p0),G.dist(fb,p1)].map(x=>x.toExponential(2)).join(', ')+' (free fit error '+free.error.toExponential(2)+')';}catch(x){gaps='free fit threw: '+x.message;}
  console.log(' edge',e.id,c.type,(c.surface&&c.surface.type)||(c.surfaces&&c.surfaces.map(s=>s.type).join('x')),'| error',r.error.toExponential(2),
    '| edge tol',e.tolerance==null?'none':e.tolerance.toExponential(2),'| vertex tol',vt.map(x=>x==null?'none':x.toExponential(2)).join(', '),'| vertex to curve',gaps);}
