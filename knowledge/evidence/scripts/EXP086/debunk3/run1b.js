const {mk,L}=require('./track.js'),{G,F,c}=L;const [B0,O]=c.surfaces;const sp0=F.spineOf(B0,1e-10).curve;const T=mk(sp0);
const r3=G.surfaceInverse(O,c.chart[3]),Tp=c.end.p,rT=G.surfaceInverse(O,Tp);let n=0,t=Date.now();
console.log('rT',rT.u,rT.v);
const fw=T.march(r3.u,r3.v,[-1,2],p=>Math.min(5e-5,0.2*G.dist(p.p,Tp)),p=>{n++;if(n>80&&n<130)console.log(n,G.dist(p.p,Tp).toExponential(3),(p.u-rT.u).toExponential(3),(p.v-rT.v).toExponential(3));return G.dist(p.p,Tp)<3e-10||n>130},2e6);
