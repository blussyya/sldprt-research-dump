// EXP-103 (finish): resolve a part and check every fitted intersection curve two ways.
//  - the fitter's own error (what the converter reports);
//  - an independent dense check: 400 points evenly in parameter along the fitted curve, each
//    measured to both of its surfaces with a foot chained from the previous sample. A foot counts
//    only if the point minus the foot lies along the foot's normal (sideways part under 1e-10 m);
//    otherwise the sample is counted as unsettled, not as a distance.
// Surface distance is a lower bound on the distance to the true curve, so this can miss error, but
// it shares no sample points with the fitter. Bar: 1e-8 m.
// usage: CONV=<converter repo> node dense.js <part> [--edges 826,844]
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const only=(process.argv.indexOf('--edges')>0)?new Set(process.argv[process.argv.indexOf('--edges')+1].split(',').map(Number)):null;
const rows=[],all=[],unset={};
const ec=F.edgeCurve;F.edgeCurve=function(e,c,...a){const r=ec.call(this,e,c,...a);
  if(r)all.push({id:e.id,type:c.type,fit:r.error});
  if(r&&c.type==='intersection'&&c.surfaces.every(s=>s.type!=='blendBound')&&(!only||only.has(e.id))){
    let worst=0,at=0,unsettled=0;const near=[null,null];
    for(let k=0;k<=400;k++){const t=r.t0+(r.t1-r.t0)*k/400,p=G.bsplineCurve(r.curve,t).p;let d=0;
      c.surfaces.forEach((s,j)=>{let f;try{f=G.surfaceFoot(s,p,near[j]);}catch(x){unsettled++;unset[s.type+' (threw)']=(unset[s.type+' (threw)']||0)+1;return;}
        near[j]={u:f.u,v:f.v};const q=G.sub(p,f.q),along=G.dot(q,f.n),side=G.norm(G.sub(q,G.mul(f.n,along)));
        if(side>1e-10){unsettled++;unset[s.type]=(unset[s.type]||0)+1;return;}d=Math.max(d,Math.abs(along));});
      if(d>worst){worst=d;at=k/400;}}
    rows.push({id:e.id,types:c.surfaces.map(s=>s.type).join('x'),fit:r.error,dense:worst,at,unsettled});}
  return r;};
const t=Date.now();let res,err=null;
try{res=P.resolve(N.build(S.readBrep(process.argv[2]).parsed));}catch(e){err=e.message;}
const over=(k)=>rows.filter(r=>r[k]>1e-8);
console.log('part',require('path').basename(process.argv[2]),'resolve',err?'THREW '+err:'ok','time',((Date.now()-t)/1e3).toFixed(1),'s');
console.log('intersection curves',rows.length,'| fitter max',Math.max(0,...rows.map(r=>r.fit)).toExponential(2),'over 1e-8:',over('fit').length,'| dense max',Math.max(0,...rows.map(r=>r.dense)).toExponential(2),'over 1e-8:',over('dense').length,'| unsettled samples',rows.reduce((a,r)=>a+r.unsettled,0));
for(const r of rows.filter(r=>r.fit>1e-8||r.dense>1e-8||(only&&only.has(r.id))).sort((a,b)=>b.dense-a.dense).slice(0,20))
  console.log('  edge',r.id,r.types,'fit',r.fit.toExponential(2),'dense',r.dense.toExponential(2),'at',r.at.toFixed(3),'unsettled',r.unsettled);
console.log('unsettled feet by surface type',JSON.stringify(unset));
const allOver=all.filter(r=>r.fit>1e-8);
console.log('all fitted edges',all.length,'over 1e-8 by the fitter:',allOver.length,allOver.map(r=>'edge '+r.id+' '+r.type+' '+r.fit.toExponential(2)).join(', '));
if(res&&res.report)console.log('report maxError',res.report.maxError.toExponential(2),'curve',res.report.errors.curve.toExponential(2),'surface',res.report.errors.surface.toExponential(2));
