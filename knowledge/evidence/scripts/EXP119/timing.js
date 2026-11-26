// EXP-119 (NQ-069): where does the resolve of a part spend its time? Wraps the fitter's two entry
// points (blendSurface, edgeCurve) and writes a line when each call starts and ends, with its
// duration and error, so a run that never finishes still shows which surface or edge it is on.
// usage: node timing.js <part> > log
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),P=require(R+'/src/brep/procedural'),fs=require('fs');
const out=m=>fs.writeSync(1,m+'\n'),t00=Date.now();
for(const k of ['blendSurface','edgeCurve']){const f=F[k];F[k]=function(...a){
  const id=k==='edgeCurve'?`edge ${a[0].id} (${a[0].displayId}) ${a[1].type}`:`face ${a[1].id} blend`;const t0=Date.now();
  out(`start ${((t0-t00)/1000).toFixed(1)} ${k} ${id}`);const r=f.apply(this,a);
  out(`end ${((Date.now()-t00)/1000).toFixed(1)} ${k} ${id} ms ${Date.now()-t0} error ${r&&r.error!==undefined?r.error.toExponential(2):'-'}`);return r;};}
const M=N.build(S.readBrep(fs.readFileSync(process.argv[2])).parsed);
out(`built ${((Date.now()-t00)/1000).toFixed(1)} s: faces ${M.faces.length}, edges ${M.edges.size}`);
const res=P.resolve(M);out('done '+((Date.now()-t00)/1000).toFixed(1)+' s '+JSON.stringify(res.report));
