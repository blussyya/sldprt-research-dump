const {mk,L}=require('./track.js'),{G,F,c}=L,fs=require('fs');
const [B0,O]=c.surfaces;
const sp0=F.spineOf({...B0},1e-12).curve;   // 9930 spine, fit error 2e-12
const T=mk(sp0);
const rT=G.surfaceInverse(O,c.end.p),r3=G.surfaceInverse(O,c.chart[3]);
const Tp=c.end.p,Lp=c.start.p;const STOP=2.5e-7;
let t=Date.now();
const fw=T.march(r3.u,r3.v,[-1,2],p=>Math.min(5e-7,0.2*G.dist(p.p,Tp)),p=>G.dist(p.p,Tp)<STOP,2e6);
console.error('fw',fw.length,Date.now()-t);
const bw=T.march(r3.u,r3.v,[1,-2],p=>Math.min(5e-7,0.2*Math.max(G.dist(p.p,Lp),1e-9)),p=>G.dist(p.p,Lp)<3e-10,2e6);
console.error('bw',bw.length,Date.now()-t);
const curve=bw.reverse().concat(fw.slice(1));
fs.writeFileSync('true.json',JSON.stringify(curve.map(q=>({u:q.u,v:q.v,p:q.p}))));
const last=curve[curve.length-1],first=curve[0];
console.log('n',curve.length,'first dist to L',G.dist(first.p,Lp),'last dist to T',G.dist(last.p,Tp),'max|h|',Math.max(...curve.map(q=>Math.abs(q.h))));
let mono=true;for(let i=1;i<curve.length;i++)if(curve[i].v<=curve[i-1].v)mono=false;console.log('v monotone',mono,'last uv - rT',last.u-rT.u,last.v-rT.v);
// other branch: seed 3 um before T
const sv=rT.v-3e-3;let su=rT.u+0.306*(-3e-3);
const o1=T.march(su,sv,[0.3,1],p=>Math.min(5e-7,0.2*G.dist(p.p,Tp)),p=>G.dist(p.p,Tp)<STOP,2e6);
const o2=T.march(su,sv,[-0.3,-1],p=>5e-7,p=>G.dist(p.p,Tp)>1.5e-3,2e6);
const other=o2.reverse().concat(o1.slice(1));
fs.writeFileSync('other.json',JSON.stringify(other.map(q=>({u:q.u,v:q.v,p:q.p}))));
console.log('other n',other.length,'ends',other[0].v-rT.v,other[other.length-1].v-rT.v,G.dist(other[other.length-1].p,Tp));
