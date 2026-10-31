const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');const fits=JSON.parse(fs.readFileSync('fits.json'));
const Tp=c.end.p;
for(const tag of ['conv','hp']){
const tr=JSON.parse(fs.readFileSync('true_'+tag+'.json')).map(q=>q.p),ot=JSON.parse(fs.readFileSync('other_'+tag+'.json')).map(q=>q.p);
const E1=tr[tr.length-1],D1=G.unit(G.sub(E1,tr[tr.length-200])),E2=ot[ot.length-1],D2=G.unit(G.sub(E2,ot[ot.length-200]));
const ld=(P,E,D)=>{const w=G.sub(P,E);const a=G.dot(w,D);return [a,G.norm(G.sub(w,G.mul(D,a)))]};
console.log('--',tag,'truth ends: branch1',G.dist(E1,Tp).toExponential(2),'from T; branch2',G.dist(E2,Tp).toExponential(2),'; angle between branch dirs deg',Math.acos(G.dot(D1,D2))*180/Math.PI);
let r=ld(Tp,E1,D1);console.log(' T relative to branch1 ext: along',r[0].toExponential(2),'lateral',r[1].toExponential(2));
r=ld(Tp,E2,D2);console.log(' T relative to branch2 ext: along',r[0].toExponential(2),'lateral',r[1].toExponential(2));
for(const name of ['nw','od']){const cv=fits[name].curve;console.log(' fit',name);
 for(const target of [3e-6,1.5e-6,1e-6,7.5e-7,5e-7,3e-7,2e-7,1.5e-7,1e-7,5e-8,2e-8,1e-8,1e-9,0]){
  const dT=t=>G.dist(G.curvePoint(cv,t),Tp);let t;
  // first t (scanning from 0.9999 up) where dT<=target  -- fine scan
  const kn=cv.knots,t0=kn[kn.length-6];let N=400000,found=null;for(let i=0;i<=N;i++){const tt=t0+(1-t0)*i/N;if(dT(tt)<=target){found=tt;break;}}
  const tt=found===null?1:found,P=G.curvePoint(cv,tt);const a=ld(P,E1,D1),b=ld(P,E2,D2);
  console.log(`  dT~${target.toExponential(1)} (t=${tt.toFixed(9)}): lateral to branch1 ext ${a[1].toExponential(2)} (along ${a[0].toExponential(2)}), to branch2 ext ${b[1].toExponential(2)}`);}
}}
