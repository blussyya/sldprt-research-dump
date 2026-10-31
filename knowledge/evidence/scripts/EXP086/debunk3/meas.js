const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');
const tr=JSON.parse(fs.readFileSync('true.json')).map(q=>q.p),ot=JSON.parse(fs.readFileSync('other.json')).map(q=>q.p);
const fits=JSON.parse(fs.readFileSync('fits.json'));const Tp=c.end.p;
// cumulative arclength of true
const cum=[0];for(let i=1;i<tr.length;i++)cum.push(cum[i-1]+G.dist(tr[i],tr[i-1]));
function dseg(P,pts,lo,hi){let best=Infinity,bi=0,bf=0;for(let i=lo;i<hi;i++){const a=pts[i],b=pts[i+1],ab=G.sub(b,a),l2=G.dot(ab,ab);let f=l2?G.dot(G.sub(P,a),ab)/l2:0;const raw=f;f=Math.max(0,Math.min(1,f));const d=G.dist(P,G.add(a,G.mul(ab,f)));if(d<best){best=d;bi=i;bf=raw;}}return {d:best,i:bi,f:bf};}
function near(P,pts){ // coarse then fine
  let bi=0,bd=Infinity;for(let i=0;i<pts.length;i+=20){const d=G.dist(P,pts[i]);if(d<bd){bd=d;bi=i}}
  return dseg(P,pts,Math.max(0,bi-25),Math.min(pts.length-1,bi+25));}
const out={};
for(const name of ['nw','od']){
  const cv=fits[name].curve;const [a,b]=G.curveRange(cv);const rows=[];
  const ts=[];for(let i=0;i<=6000;i++)ts.push(a+(b-a)*i/6000);for(let k=1;k<=40;k++)ts.push(b-(b-a)*Math.pow(2,-k/1.5)*1e-2*0.0+ (b-a)*Math.pow(10,-3-k/6));
  // dense in last knot spans
  const kn=cv.knots;const lastSpan=kn[kn.length-5];for(let i=0;i<=3000;i++)ts.push(lastSpan+(b-lastSpan)*i/3000);
  ts.sort((x,y)=>x-y);
  for(const t of ts){if(t>b||t<a)continue;const P=G.curvePoint(cv,t),dT=G.dist(P,Tp);const r=near(P,tr),o=near(P,ot);rows.push({t,dT,d:r.d,clamped:(r.i===tr.length-2&&r.f>1)||(r.i===0&&r.f<0),dO:o.d,s:cum[r.i]});}
  out[name]=rows;
}
fs.writeFileSync('meas.json',JSON.stringify(out));
for(const name of ['nw','od']){
  const rows=out[name];console.log('==',name,'reported err',fits[name].error);
  // split by dT
  const bins=[[2.5e-7,Infinity],[1e-6,2.5e-7],[1e-5,1e-6],[1e-4,1e-5],[1e-3,1e-4],[1e-2,1e-3]];
  for(const [lo,hi] of [[2.5e-7,1e-6],[1e-6,1e-5],[1e-5,1e-4],[1e-4,1e-3],[1e-3,1e-2]]){const r=rows.filter(x=>x.dT>=lo&&x.dT<hi);if(r.length){const m=r.reduce((p,q)=>q.d>p.d?q:p);console.log(`dT in [${lo},${hi}) n=${r.length} max dev ${m.d.toExponential(2)} at dT=${m.dT.toExponential(2)}`)}}
  const far=rows.filter(x=>x.dT>=1e-2);const m=far.reduce((p,q)=>q.d>p.d?q:p);console.log('dT>=1cm... (rest of curve): max dev',m.d.toExponential(2),'at s=',m.s,'dT',m.dT);
  const e=rows.filter(x=>x.dT<2.5e-7);console.log('inside 0.25um: n',e.length,'dev to branch1 polyline (clamped end) max',Math.max(...e.map(x=>x.d)).toExponential(2),'dist to other branch min/max',Math.min(...e.map(x=>x.dO)).toExponential(2),Math.max(...e.map(x=>x.dO)).toExponential(2));
}
