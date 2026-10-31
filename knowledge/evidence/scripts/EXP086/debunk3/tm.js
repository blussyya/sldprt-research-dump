const {mk,L}=require('./track.js'),{G,F,c}=L;const [B0,O]=c.surfaces;const sp0=F.spineOf(B0,1e-10).curve;const T=mk(sp0);
const r3=G.surfaceInverse(O,c.chart[3]);let t=Date.now();for(let i=0;i<200;i++)T.H(r3.u,r3.v);console.log('H ms',(Date.now()-t)/200);
t=Date.now();for(let i=0;i<200;i++)G.surfaceEval(O,r3.u,r3.v);console.log('surfEval ms',(Date.now()-t)/200);
console.log(sp0.ctrl.length,sp0.degree);
// compare with global projection
const P=T.H(r3.u,r3.v);const e=G.surfaceEval(O,r3.u,r3.v).p;const t2=G.curveProject(sp0,e).t;console.log('h fast',P.h,'h glob',G.dist(G.curvePoint(sp0,t2),e)-0.002);
t=Date.now();for(let i=0;i<200;i++)T.H(r3.u+i*1e-6,r3.v);console.log('H ms',(Date.now()-t)/200);
