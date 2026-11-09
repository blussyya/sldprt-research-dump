// EXP-103: resolve a part and print the largest fit error over all fitted curves and blend surfaces,
// the count over the 1e-8 m bar, edge 826 and blend 3369 if present, and the errors that threw.
// usage: CONV=<repo> node measure.js <part>
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const rows=[];
const em=F.edgeCurve;F.edgeCurve=function(e,c,...a){const r=em.call(this,e,c,...a);if(r)rows.push({k:'edge '+e.id,err:r.error});return r;};
const bm=F.blendSurface;F.blendSurface=function(b,f,...a){const r=bm.call(this,b,f,...a);rows.push({k:'blend '+b.node,err:r.error});return r;};
const t=Date.now();let res;
try{res=P.resolve(N.build(S.readBrep(process.argv[2]).parsed));}catch(e){console.log('resolve threw:',e.message,e.stack.split('\n').slice(1,7).join(' | '));}
const mx=rows.reduce((a,r)=>r.err>a.err?r:a,{err:0});
console.log('fits',rows.length,'max',mx.err.toExponential(2),'at',mx.k,'; over 1e-8:',rows.filter(r=>r.err>1e-8).length,(rows.filter(r=>r.err>1e-8).map(r=>r.k+' '+r.err.toExponential(2)).join(', ')));
for(const r of rows)if(r.k==='edge 826'||r.k==='blend 3369')console.log(r.k,'error',r.err.toExponential(2),'m');
if(res&&res.report)console.log('report',JSON.stringify(res.report));
console.log('time',(Date.now()-t)/1e3,'s');
