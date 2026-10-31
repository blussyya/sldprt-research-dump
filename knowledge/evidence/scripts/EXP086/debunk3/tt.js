const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');const Tp=c.end.p;
const A=JSON.parse(fs.readFileSync('true_conv.json')).map(q=>q.p),B=JSON.parse(fs.readFileSync('true_hp.json')).map(q=>q.p),C=JSON.parse(fs.readFileSync('true.json')).map(q=>q.p);
function dseg(P,pts,lo,hi){let best=Infinity;for(let i=lo;i<hi;i++){const a=pts[i],b=pts[i+1],ab=G.sub(b,a),l2=G.dot(ab,ab);let f=l2?G.dot(G.sub(P,a),ab)/l2:0;f=Math.max(0,Math.min(1,f));best=Math.min(best,G.dist(P,G.add(a,G.mul(ab,f))));}return best;}
function near(P,pts){let bi=0,bd=Infinity;for(let i=0;i<pts.length;i+=20){const d=G.dist(P,pts[i]);if(d<bd){bd=d;bi=i}}return dseg(P,pts,Math.max(0,bi-25),Math.min(pts.length-1,bi+25));}
const bins=[[2.5e-7,5e-7],[5e-7,1e-6],[1e-6,2e-6],[2e-6,5e-6],[5e-6,1e-5],[1e-5,1e-4],[1e-4,1e-3],[1e-3,1e-2]];
const mx=bins.map(()=>0),mp=bins.map(()=>0);
for(const P of A){const d=G.dist(P,Tp);bins.forEach(([lo,hi],i)=>{if(d>=lo&&d<hi){mx[i]=Math.max(mx[i],near(P,B));}});}
// whole curve
let whole=0,wat=0;for(let i=0;i<A.length;i+=7){const d=near(A[i],B);if(d>whole&&G.dist(A[i],Tp)>1e-5){whole=d;wat=G.dist(A[i],Tp)}}
bins.forEach(([lo,hi],i)=>console.log(`dT [${lo},${hi}) conv-spine curve vs hp curve max ${mx[i].toExponential(2)}`));
console.log('max over dT>1e-5',whole.toExponential(2),'at dT',wat);
