const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');
const trF=process.argv[2]||'true.json',otF=process.argv[3]||'other.json';
const tr=JSON.parse(fs.readFileSync(trF)).map(q=>q.p),ot=JSON.parse(fs.readFileSync(otF)).map(q=>q.p);
const fits=JSON.parse(fs.readFileSync('fits.json'));const Tp=c.end.p;
function dseg(P,pts,lo,hi){let best=Infinity,bi=0,bf=0;for(let i=lo;i<hi;i++){const a=pts[i],b=pts[i+1],ab=G.sub(b,a),l2=G.dot(ab,ab);let f=l2?G.dot(G.sub(P,a),ab)/l2:0;const raw=f;f=Math.max(0,Math.min(1,f));const d=G.dist(P,G.add(a,G.mul(ab,f)));if(d<best){best=d;bi=i;bf=raw;}}return {d:best,i:bi,f:bf};}
function near(P,pts){let bi=0,bd=Infinity;for(let i=0;i<pts.length;i+=20){const d=G.dist(P,pts[i]);if(d<bd){bd=d;bi=i}}return dseg(P,pts,Math.max(0,bi-25),Math.min(pts.length-1,bi+25));}
const res={};
for(const name of ['nw','od']){
  const cv=fits[name].curve;const [a,b]=G.curveRange(cv);const rows=[];
  const dT=t=>G.dist(G.curvePoint(cv,t),Tp);
  // t's by target distance to T (curve is monotone into T near the end, check later)
  const ts=[];
  for(let k=0;k<=240;k++){const target=1e-10*Math.pow(10,k/30);let lo=0.9,hi=b;/* find t in [0.9,b] with dT=target: assume decreasing */ lo=0.99;
    for(let it=0;it<100;it++){const m=(lo+hi)/2;if(dT(m)>target)lo=m;else hi=m;}ts.push((lo+hi)/2);}
  for(let i=0;i<=3000;i++)ts.push(a+(0.99-a)*i/3000);
  for(const t of ts){const P=G.curvePoint(cv,t);const r=near(P,tr),o=near(P,ot);rows.push({t,dT:G.dist(P,Tp),d:r.d,dO:o.d,f:r.f,i:r.i});}
  res[name]=rows;
  console.log('==',name,'reported err',fits[name].error);
  const bins=[[0,1e-8],[1e-8,1e-7],[1e-7,2.5e-7],[2.5e-7,5e-7],[5e-7,1e-6],[1e-6,2e-6],[2e-6,5e-6],[5e-6,1e-5],[1e-5,1e-4],[1e-4,1e-3],[1e-3,1e-2]];
  for(const [lo,hi] of bins){const r=rows.filter(x=>x.dT>=lo&&x.dT<hi);if(r.length){const m=r.reduce((p,q)=>q.d>p.d?q:p);const mo=r.reduce((p,q)=>q.dO<p.dO?q:p);console.log(`dT [${lo},${hi}) n=${r.length} maxdev(branch1) ${m.d.toExponential(2)} @dT=${m.dT.toExponential(2)}  min dist to other branch ${mo.dO.toExponential(2)}`)}}
  const far=rows.filter(x=>x.dT>=1e-2);if(far.length){const m=far.reduce((p,q)=>q.d>p.d?q:p);console.log('dT>=1cm max dev',m.d.toExponential(2),'at dT',m.dT)}
}
fs.writeFileSync('meas2.json',JSON.stringify(res));
