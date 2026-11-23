// EXP-103: for blend NODE of a part, rebuild its spine the way fit.js spineOf does, then report
//  (a) fitPoints' own error and sample count,
//  (b) residual of the exact points polyFn gives on a dense grid: max(|dist to S1|,|dist to S2|), bar 1e-8 m,
//  (c) offset-surface foot/corrector diagnostics.
// usage: CONV=<repo> node spine.js <part.sldprt> <blend node>
const path=require('path'),Module=require('module'),fs=require('fs');
const R=process.env.CONV||'/home/user/solidworks-converters';
const fp=R+'/src/brep/fit.js';
const m=new Module(fp,module);m.filename=fp;m.paths=Module._nodeModulePaths(path.dirname(fp));
m._compile(fs.readFileSync(fp,'utf8').replace('return {interp,','return {_i:{polyFn,chartMarch,march,footOn,corrector,fitPoints},interp,'),fp);
const I=m.exports._i;if(!I)throw Error('hook failed');
const S=require(R+'/src'),N=require(R+'/src/brep/native');
const node=+process.argv[3];
const n=N.build(S.readBrep(process.argv[2]).parsed);
const f=n.faces.find(f=>f.surface.node===node);if(!f)throw Error('no face on blend '+node);
let c=f.surface.spine;if(c.type==='trimmed')c=c.basis;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
console.log('spine',c.type,'surfaces',c.surfaces.map(s=>s.type+s.node).join(' x '),'chart',c.chart.length);
const A=c.start.p,B=c.end.p,cd=sub(c.chart[1],c.chart[0]);
let scale=0;for(let i=1;i<c.chart.length;i++)scale+=dist(c.chart[i],c.chart[i-1]);
const poly=I.chartMarch(c.surfaces[0],c.surfaces[1],A,B,c.chart)||I.march(c.surfaces[0],c.surfaces[1],A,B,cd,scale,false);
console.log('poly points',poly.length);
const {ss,fn}=I.polyFn(c.surfaces[0],c.surfaces[1],poly);
let worst=0,over=0,nul=0,tot=0,wi=-1;
for(let i=0;i<ss.length-1;i++)for(const k of [0.1,0.25,0.5,0.75,0.9]){
  const q=fn(ss[i]+(ss[i+1]-ss[i])*k);tot++;if(!q){nul++;continue;}
  const a=I.footOn(c.surfaces[0],q,new Map()),b=I.footOn(c.surfaces[1],q,new Map());
  const r=Math.max(Math.abs(a.d),Math.abs(b.d));if(r>1e-8)over++;if(r>worst){worst=r;wi=i;}}
console.log('polyFn residual: max',worst.toExponential(2),'m at segment',wi,'; over 1e-8:',over,'of',tot,'null',nul);
try{const t=Date.now();const r=I.fitPoints(fn,ss,1e-9,{fixed:poly});console.log('fitPoints: error',r.error.toExponential(2),'samples',r.samples,'offBranch',r.offBranch,(Date.now()-t)/1e3,'s');}catch(e){console.log('fitPoints threw',e.message);}
