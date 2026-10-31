const {L}=require('./track.js'),{G,F,c}=L,fs=require('fs');const fits=JSON.parse(fs.readFileSync('fits.json'));
const tr=JSON.parse(fs.readFileSync('true_conv.json')).map(q=>q.p);const n=tr.length;
const Tdir=G.unit(G.sub(tr[n-1],tr[n-60]));
for(const name of ['nw','od']){const cv=fits[name].curve;const kn=cv.knots;
  // check tangent·Tdir over the last 6 knot spans, dense
  const t0=kn[kn.length-10];let neg=0,first=null,N=200000,minD=Infinity;let lastPos=null;
  let rev=[];let prevSign=null;
  for(let i=0;i<=N;i++){const t=t0+(1-t0)*i/N,e=G.bsplineCurve(cv,t),s=G.dot(e.d,Tdir);if(s<=0){neg++;if(first===null)first=t}
    const sg=s>0;if(prevSign!==null&&sg!==prevSign)rev.push({t,dT:G.dist(e.p,c.end.p)});prevSign=sg;}
  console.log(name,'last-10-knot window t0',t0,'samples with tangent·Tdir<=0:',neg,'sign changes',rev.length,rev.slice(0,6).map(r=>r.t.toFixed(9)+'@dT='+r.dT.toExponential(2)).join(' '));
  // along the whole curve: tangent vs chart direction continuity: min cos between tangent and local chord of 2000 pts
  let mc=1,at=0;const M=20000;let pp=G.curvePoint(cv,0);for(let i=1;i<=M;i++){const t=i/M,p=G.curvePoint(cv,t),e=G.bsplineCurve(cv,t);const ch=G.sub(p,pp);if(G.norm(ch)>0){const cs=G.dot(G.unit(e.d),G.unit(ch));if(cs<mc){mc=cs;at=t}}pp=p;}
  console.log(name,'min cos(tangent, chord) over 20000 pieces',mc,'at t',at);
  // loop extent: max distance from the fit points in last span to branch1 line using lateral
}
