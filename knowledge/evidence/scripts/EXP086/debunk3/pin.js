const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');
const [S1,S2]=c.surfaces;const Tp=c.end.p;
const tag=process.argv[2]||'conv';
const tr=JSON.parse(fs.readFileSync('true_'+tag+'.json')).map(q=>q.p),ot=JSON.parse(fs.readFileSync('other_'+tag+'.json')).map(q=>q.p);
const E1=tr[tr.length-1],D1=G.unit(G.sub(E1,tr[tr.length-200])),E2=ot[ot.length-1],D2=G.unit(G.sub(E2,ot[ot.length-200]));
const lat=(P,E,D)=>{const w=G.sub(P,E),a=G.dot(w,D);return G.norm(G.sub(w,G.mul(D,a)))};
const cache=new Map();const P0=c.chart[4];let Pk=P0;const Tdir0=G.unit(G.sub(Tp,P0));
console.log('chart4->T',G.dist(P0,Tp));
let a=null;for(let k=1;k<=15;k++){const X=F.corrector(S1,S2,G.add(P0,G.mul(G.sub(Tp,P0),k/16)),Tdir0,cache);a=X;
 if(k>=12)console.log('poly k',k,'dist to T',G.dist(X,Tp).toExponential(2),'lat b1',lat(X,E1,D1).toExponential(2),'lat b2',lat(X,E2,D2).toExponential(2));}
// now samples in last chord a->T like polyFn
const T=Tp,dir=G.unit(G.sub(T,a)),L0=G.dist(a,T);console.log('last chord len',L0);
console.log('guess dist-to-T | X dist-to-T | X lat b1 | X lat b2 | 2x rule');
for(const dg of [3e-7,2e-7,1.5e-7,1e-7,7e-8,5e-8,3e-8,2e-8,1e-8,5e-9,2e-9,1e-9,1e-10]){
  const g=G.add(T,G.mul(dir,-dg));
  let X;try{X=F.corrector(S1,S2,g,dir,cache);}catch(e){console.log(dg.toExponential(1),'throws',e.message.slice(0,50));continue;}
  const rej=G.dist(X,a)>2*G.dist(g,a)+1e-12||G.dist(X,T)>2*G.dist(g,T)+1e-12;
  console.log(dg.toExponential(1),G.dist(X,T).toExponential(2),lat(X,E1,D1).toExponential(2),lat(X,E2,D2).toExponential(2),rej?'REJECT':'accept');}
