// EXP-103 (finish): every SP_CURVE edge of a part whose fitted curve doesn't end on its vertex
// (further than 1e-12 m): how far it ends from the vertex, and that vertex's tolerance (the larger
// of the edge's and its own). A freed end must be within it. One line per part, then the ends.
// usage: CONV=<repo> node freed.js <part>
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const M=N.build(S.readBrep(process.argv[2]).parsed),ends=[];let sp=0;
const em=F.edgeCurve;F.edgeCurve=function(e,c,p0,p1,o){const r=em.call(this,e,c,p0,p1,o);
  if(r&&c.type==='spcurve'&&p0){sp++;const a=G.bsplineCurve(r.curve,r.t0).p,b=G.bsplineCurve(r.curve,r.t1).p;
    [[a,p0,0],[b,p1,1]].forEach(([q,p,i])=>{const g=G.dist(q,p);if(g>1e-12){const vt=Math.max(e.tolerance||0,M.vertices.get(e.v[i]).tolerance||0);
      ends.push({edge:e.id,surface:c.surface.type,blend:!!c.surface.uRange,gap:g,tol:vt,error:r.error});}});}
  return r;};
let err=null;try{P.resolve(M);}catch(x){err=x.message;}
const bad=ends.filter(x=>x.gap>x.tol);
console.log(require('path').basename(process.argv[2]).slice(0,32).padEnd(32),err?'ERR '+err.slice(0,60):'ok','spcurve edges',sp,'| ends not on their vertex',ends.length,'| beyond tolerance',bad.length);
for(const x of ends)console.log('   edge',x.edge,x.surface+(x.blend?' (fitted blend)':''),'gap',x.gap.toExponential(2),'tolerance',x.tol.toExponential(2),x.gap>x.tol?'BEYOND, pinned? error '+x.error.toExponential(2):'');
