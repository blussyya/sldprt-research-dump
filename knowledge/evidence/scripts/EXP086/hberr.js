// Resolve a part and list every fitted edge curve and blend surface whose fit error is over 1e-8 m.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const desc=s=>s.type+s.node;
const em=F.edgeCurve;F.edgeCurve=function(e,c,...a){const r=em.call(this,e,c,...a);
  if(r&&r.error>1e-8){let k=c.type==='trimmed'?c.basis:c;console.log('curve',e.id,k.type,k.surfaces?k.surfaces.map(desc).join(' x '):'','v',e.v,'error',r.error.toExponential(2));}return r;};
const bm=F.blendSurface;F.blendSurface=function(b,f,...a){const r=bm.call(this,b,f,...a);
  if(r.error>1e-8)console.log('surface blend',b.node,'face',f.id,'r',b.range[0],'supports',b.surfaces.map(desc).join(' '),'error',r.error.toExponential(2));return r;};
const t=Date.now();P.resolve(N.build(S.readBrep(process.argv[2]).parsed));console.log('done',(Date.now()-t)/1e3,'s');
