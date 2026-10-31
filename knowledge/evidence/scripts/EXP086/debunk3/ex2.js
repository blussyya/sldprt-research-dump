const {G,F,c,b}=require('./load.js');
const [B0,O]=c.surfaces;
const sp0=F.spineOf(B0,1e-10);console.log('9930 spine',sp0.curve.type,sp0.error,B0.spine.type, (B0.spine.basis||B0.spine).type, B0.spineSense);
console.log(Object.keys(G).join(' '));
const A=c.start.p,E=c.end.p;
for(const [n,p] of [['L',A],['T',E]]){const r=G.surfaceInverse(O,p);const e=G.surfaceEval(O,r.u,r.v);console.log(n,'u,v',r.u,r.v,'dist',G.dist(e.p,p));
 const t=G.curveProject(sp0.curve,p);console.log(' pipe',G.dist(G.curvePoint(sp0.curve,t.t),p)-0.002, 't',t.t)}
console.log('ku',O.basis.ku.slice(0,3),O.basis.ku.slice(-3),'kv',O.basis.kv.slice(0,3),O.basis.kv.slice(-3));
