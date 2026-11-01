const {F,G,S1,S2,c,fs}=require('./common');
const bs=S1.basis,d=S1.d;
const off=(u,v)=>{const e=G.surfaceEval(bs,u,v);return G.add(e.p,G.mul(G.unit(G.cross(e.du,e.dv)),d));};
const fa=[-13.2322,47.5587],fb=[-13.8517,71.7101],fc=[-13.8614,71.7077];
console.log('3D dist edge-foot basis vs ext-foot basis',G.dist(G.surfaceEval(bs,...fa).p,G.surfaceEval(bs,...fb).p));
console.log('offset pts', G.dist(off(...fa),off(...fb)));
const bad=JSON.parse(fs.readFileSync('pts4.json')).find(p=>Math.abs(p.s-0.0603)<2e-5);
console.log('|bad-off(fa)|',G.dist(bad.X,off(...fa)),'|bad-off(fb)|',G.dist(bad.X,off(...fb)),'|bad-off(fc)|',G.dist(bad.X,off(...fc)));
// self-approach of the offset surface, whole range + extension region
const U=[-30,10],V=[30,80],nu=60,nv=100;const P=[];
for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=U[0]+(U[1]-U[0])*i/nu,v=V[0]+(V[1]-V[0])*j/nv;P.push({u,v,p:off(u,v)});}
// sheet-separation test: pairs far in parameter but close in space
let best=[];for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++){const dd=G.dist(P[a].p,P[b].p);if(dd<2e-3&&Math.hypot((P[a].u-P[b].u)*0.5,(P[a].v-P[b].v)*0.5)>8)best.push([dd,P[a].u,P[a].v,P[b].u,P[b].v]);}
best.sort((x,y)=>x[0]-y[0]);console.log('far-in-param pairs within 2mm:',best.length,best.slice(0,5));
// param spacing in mm
console.log('mm per unit v at ext',G.dist(off(-13.85,71),off(-13.85,72)),'u',G.dist(off(-13,71),off(-14,71)), 'v near edge',G.dist(off(-13.2,47),off(-13.2,46)));
