const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');
const [S1,S2]=c.surfaces;const Tp=c.end.p;
// residual distances to each surface at a point: pipe (S1=blend9930 about its converter spine) and offset (S2)
const spC=F.spineOf(S1,1e-10).curve;
const res=P=>{const t=G.curveProject(spC,P).t;const d1=G.dist(P,G.curvePoint(spC,t))-0.002;const r=G.surfaceInverse(S2,P);const d2=G.dist(P,G.surfaceEval(S2,r.u,r.v).p);return [d1,d2]};
const cache=new Map();const P0=c.chart[4];const Tdir0=G.unit(G.sub(Tp,P0));let a=null;
for(let k=1;k<=15;k++)a=F.corrector(S1,S2,G.add(P0,G.mul(G.sub(Tp,P0),k/16)),Tdir0,cache);
const dir=G.unit(G.sub(Tp,a));
console.log('residual |pipe dist|, |offset dist| at the corrector output');
for(const dg of [3e-7,1e-7,5e-8,1e-8,1e-9,1e-10]){const g=G.add(Tp,G.mul(dir,-dg));const X=F.corrector(S1,S2,g,dir,cache);const r=res(X);console.log('guess',dg.toExponential(1),'X dT',G.dist(X,Tp).toExponential(2),'resid',r[0].toExponential(2),r[1].toExponential(2));}
// scale reference: pipe residual of a point displaced 1.5e-7 sideways from the true branch
console.log('h at T:',res(Tp).map(x=>x.toExponential(2)).join(' '));
