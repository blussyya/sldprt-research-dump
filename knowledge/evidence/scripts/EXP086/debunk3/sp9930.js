const {L}=require('./track.js'),{G,F,c}=L;const [B0,O]=c.surfaces;
const Fo=require('./fit_old.js');
let sp=B0.spine;if(sp.type==='trimmed')sp=sp.basis;
console.log('9930 spine',sp.type,sp.start&&sp.start.type,sp.end&&sp.end.type,sp.surfaces.map(s=>s.type+s.node),'blend start/end',B0.start&&B0.start.type,B0.end&&B0.end.type);
let t=Date.now();
const a=F.spineOf(B0,1e-10);console.log('1e-10 new',a.error,Date.now()-t);t=Date.now();
const b2=F.spineOf({...B0},1e-12);console.log('1e-12 new',b2.error,b2.curve.ctrl.length,Date.now()-t);t=Date.now();
const o2=Fo.spineOf({...B0},1e-12);console.log('1e-12 old',o2.error,o2.curve.ctrl.length,Date.now()-t);
// compare pairwise at 20000 params
function maxd(c1,c2){let m=0,at=0;for(let i=0;i<=20000;i++){const t=i/20000,p=G.curvePoint(c1,t),pr=G.curveProject(c2,p);if(pr.d>m){m=pr.d;at=t}}return [m,at]}
