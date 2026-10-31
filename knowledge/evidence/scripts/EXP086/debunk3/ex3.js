const {G,F,c,b}=require('./load.js');
const [B0,O]=c.surfaces;
const sp0=F.spineOf(B0,1e-10).curve;
const h=(u,v)=>{const p=G.surfaceEval(O,u,v).p,t=G.curveProject(sp0,p).t;return G.dist(G.curvePoint(sp0,t),p)-0.002;};
let prev=null;
for(const [n,p] of [...c.chart.map((p,i)=>['ch'+i,p]),['L',c.start.p],['T',c.end.p]]){const r=G.surfaceInverse(O,p);console.log(n,r.u.toFixed(5),r.v.toFixed(5),'h',h(r.u,r.v).toExponential(2));}
const rT=G.surfaceInverse(O,c.end.p),e=G.surfaceEval(O,rT.u,rT.v);
console.log('du,dv norms',G.norm(e.du),G.norm(e.dv),'dudv',G.dot(e.du,e.dv));
// h grid near T
const du=1e-3;
const H=[];for(const a of [-1,0,1])for(const bb of [-1,0,1]){H.push(h(rT.u+a*du,rT.v+bb*du));}
console.log('h 3x3 (u rows, v cols) step',du, H.map(x=>x.toExponential(2)).join(' '));
