// EXP-119: time each support blend's spine on its own, at the tolerances the fitter asks for
// (footOn and contact ask spineOf(s, 1e-10), which fits to 1e-11; blendSurface asks 1e-8, fitting
// to 1e-9), and report the samples used (control points of the fitted spine).
// usage: node nested.js <part> <face id>
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const [file,fid]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed),b=M.faces.find(x=>x.id===+fid).surface;
const out=m=>fs.writeSync(1,m+'\n');
for(const [name,s] of [['support 0',b.surfaces[0]],['support 1',b.surfaces[1]]]){
  if(s.type!=='blend')continue;const sp=s.spine.type==='trimmed'?s.spine.basis:s.spine;
  for(const tol of [1e-8,1e-10]){
    // fresh module each time so the spine memo doesn't carry over
    for(const k of Object.keys(require.cache))if(/solidworks-converters\/src\/brep\/fit/.test(k))delete require.cache[k];
    const F=require(R+'/src/brep/fit'),t=Date.now();
    try{const r=F.spineOf(s,tol);out(`${name} blend${s.node} r ${JSON.stringify(s.range)} spine ${sp.type}: spineOf(tol ${tol}) ${((Date.now()-t)/1000).toFixed(1)} s, ${r.curve.ctrl?r.curve.ctrl.length:'exact'} control points, error ${r.error.toExponential(2)}`);}
    catch(e){out(`${name}: spineOf(tol ${tol}) threw after ${((Date.now()-t)/1000).toFixed(1)} s: ${e.message}`);}}}
