const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');const fits=JSON.parse(fs.readFileSync('fits.json'));
const Tp=c.end.p;const tr=JSON.parse(fs.readFileSync('true_hp.json')).map(q=>q.p);const n=tr.length;
const D1=G.unit(G.sub(tr[n-1],tr[n-200]));
for(const name of ['od','nw']){const cv=fits[name].curve;const kn=cv.knots;console.log(name,'last knots',kn.slice(-7).map(x=>x.toFixed(10)).join(' '));
 const ta=kn[kn.length-5];let minA=Infinity,maxA=-Infinity,maxDT=0,maxLat=0,N=100000,pa=null,path=0;
 for(let i=0;i<=N;i++){const t=ta+(1-ta)*i/N,P=G.curvePoint(cv,t),w=G.sub(P,Tp),a=G.dot(w,D1),lat=G.norm(G.sub(w,G.mul(D1,a)));if(a<minA)minA=a;if(a>maxA)maxA=a;maxLat=Math.max(maxLat,lat);maxDT=Math.max(maxDT,G.norm(w));if(pa)path+=G.dist(P,pa);pa=P;}
 console.log(' last span only: along-branch1 coordinate (T=0, negative = before T) from',minA.toExponential(2),'to',maxA.toExponential(2),'; max lateral from T-line',maxLat.toExponential(2),'; path length in last span',path.toExponential(2),'; span chord',G.dist(G.curvePoint(cv,ta),Tp).toExponential(2));
}
