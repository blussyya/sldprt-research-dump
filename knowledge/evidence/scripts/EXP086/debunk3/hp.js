const {L}=require('./track.js'),{G,F,c}=L;const [B0,O]=c.surfaces;
const Fh=require('./fit_hp.js');
let t=Date.now();const h=Fh.spineOf({...B0},1e-12);console.log('hp 9930 spine err',h.error,h.curve.ctrl.length,Date.now()-t);
const a=F.spineOf(B0,1e-10).curve;let m=0;for(let i=0;i<=5000;i++){const p=G.curvePoint(h.curve,i/5000);m=Math.max(m,G.curveProject(a,p).d)}console.log('max dist hp vs converter 1e-10 spine',m);
