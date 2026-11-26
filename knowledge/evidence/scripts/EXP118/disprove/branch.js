// Points along a native edge from its start vertex to its end vertex, using the reader's sense
// (flip=false) or the opposite sense (flip=true). Circles analytically, intersections along their
// chart polyline (wrapping through the closure of a closed chart), other curves by parameter.
'use strict';
const L=require('./lib'),G=require(L.R+'/src/geom/eval');
function chartPos(ps,p){let best={s:0,d:Infinity};for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],ab=G.sub(b,a),t=Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/(G.dot(ab,ab)||1))),d=G.dist(p,G.add(a,G.mul(ab,t)));if(d<best.d)best={s:i-1+t,d};}return best;}
function at(ps,s){const i=Math.min(ps.length-2,Math.floor(s)),t=s-i;return G.add(ps[i],G.mul(G.sub(ps[i+1],ps[i]),t));}
function branch(M,e,flip,n){
  n=n||256;const same=flip?!e.sameSense:e.sameSense,c=e.curve;
  if(!e.v||e.v[0]===null){ // ring
    const C=c.type==='trimmed'?c.basis:c;if(C.type==='circle'||C.type==='ellipse'){const out=[];for(let i=0;i<=n;i++)out.push(G.curvePoint(C,i*G.TAU/n));return out;}
    if(C.type==='intersection')return C.chart.map(x=>x.slice(0,3));
    const [a,b]=G.curveRange(C);const out=[];for(let i=0;i<=n;i++)out.push(G.curvePoint(C,a+(b-a)*i/n));return out;}
  const p0=M.vertices.get(e.v[0]).p,p1=M.vertices.get(e.v[1]).p;
  const C=c.type==='trimmed'?c.basis:c;
  if(C.type==='circle'||C.type==='ellipse'){
    const t=p=>{const {x,y}=G.frame(C.n,C.x),q=G.sub(p,C.c);let a=Math.atan2(G.dot(q,y)/(C.r2||C.r),G.dot(q,x)/(C.r1||C.r));return a<0?a+G.TAU:a;};
    const t0=t(p0),t1=t(p1);let span=same?((t1-t0)%G.TAU+G.TAU)%G.TAU:-(((t0-t1)%G.TAU+G.TAU)%G.TAU);
    if(Math.abs(span)<1e-12&&e.v[0]===e.v[1])span=same?G.TAU:-G.TAU;
    const out=[];for(let i=0;i<=n;i++)out.push(G.curvePoint(C,t0+span*i/n));return out;}
  if(C.type==='line')return [p0,p1];
  if(C.type==='intersection'){
    const ps=C.chart.map(x=>x.slice(0,3)),closed=G.dist(ps[0],ps[ps.length-1])<1e-9,end=ps.length-1;
    let s0=chartPos(ps,p0).s,s1=chartPos(ps,p1).s;
    if(closed){if(s0<1e-9&&!same)s0=end;else if(s0>end-1e-9&&same)s0=0;if(s1<1e-9&&same)s1=end;else if(s1>end-1e-9&&!same)s1=0;}
    const out=[];const step=0.25;
    if(same){if(s1>=s0){for(let s=s0;s<s1;s+=step)out.push(at(ps,s));}else if(closed){for(let s=s0;s<end;s+=step)out.push(at(ps,s));for(let s=0;s<s1;s+=step)out.push(at(ps,s));}else return null;}
    else{if(s1<=s0){for(let s=s0;s>s1;s-=step)out.push(at(ps,s));}else if(closed){for(let s=s0;s>0;s-=step)out.push(at(ps,s));for(let s=end;s>s1;s-=step)out.push(at(ps,s));}else return null;}
    out.push(at(ps,s1));return out;}
  // other curves: by parameter between the vertices' params
  try{const a=G.curveProject(c,p0).t,b=G.curveProject(c,p1).t;const out=[];for(let i=0;i<=n;i++)out.push(G.curvePoint(c,a+(b-a)*i/n));return out;}catch(_){return null;}
}
function polyDist(ps,p){let m=Infinity;if(ps.length===1)return G.dist(ps[0],p);for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],ab=G.sub(b,a),t=Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/(G.dot(ab,ab)||1)));m=Math.min(m,G.dist(p,G.add(a,G.mul(ab,t))));}return m;}
module.exports={branch,polyDist,chartPos};
