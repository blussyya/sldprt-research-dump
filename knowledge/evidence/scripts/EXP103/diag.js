// EXP-103: which polyFn points are off, and what the offset's foot does there.
// usage: CONV=<repo> node diag.js <part> <blend node>
const path=require('path'),Module=require('module'),fs=require('fs');
const R=process.env.CONV||'/home/user/solidworks-converters';
const fp=R+'/src/brep/fit.js';
const m=new Module(fp,module);m.filename=fp;m.paths=Module._nodeModulePaths(path.dirname(fp));
m._compile(fs.readFileSync(fp,'utf8').replace('return {interp,','return {_i:{polyFn,chartMarch,march,footOn,corrector,fitPoints},interp,'),fp);
const I=m.exports._i,S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed);
const f=n.faces.find(f=>f.surface.node===+process.argv[3]);let c=f.surface.spine;if(c.type==='trimmed')c=c.basis;
const [S1,S2]=c.surfaces;const off=S1.type==='offset'?S1:S2;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const A=c.start.p,B=c.end.p,cd=sub(c.chart[1],c.chart[0]);let scale=0;for(let i=1;i<c.chart.length;i++)scale+=G.dist(c.chart[i],c.chart[i-1]);
const poly=I.chartMarch(S1,S2,A,B,c.chart)||I.march(S1,S2,A,B,cd,scale,false);
const {ss,fn}=I.polyFn(S1,S2,poly);
const [[u0,u1],[v0,v1]]=G.surfaceRange(off.basis);
console.log('offset d',off.d,'basis range u',u0,u1,'v',v0,v1);
// independent foot: dense grid on the basis extended 3 units each side, then Newton; no seeding
function indep(p){let best=null;const K=300;
  for(let i=0;i<=K;i++)for(let j=0;j<=K;j++){const u=u0-1+(u1-u0+2)*i/K,v=v0-1+(v1-v0+2)*j/K;const e=G.surfaceEval(off,u,v),d=G.dist(p,e.p);if(!best||d<best.d)best={u,v,d};}
  return best;}
for(let i=0;i<ss.length-1;i++)for(const k of [0.1,0.5,0.9]){
  const q=fn(ss[i]+(ss[i+1]-ss[i])*k);if(!q)continue;
  const a=I.footOn(off,q,new Map());const r=Math.abs(a.d);
  if(r>1e-8){const cache=new Map();I.footOn(off,q,cache);const uv=cache.get(off);
    console.log('seg',i,'k',k,'|d| to offset',r.toExponential(2),'foot uv',uv.u.toFixed(4),uv.v.toFixed(4),'inRange',uv.u>=u0&&uv.u<=u1&&uv.v>=v0&&uv.v<=v1);}
}
// trace of the free Newton from the clamped foot, for the worst point
{ let worst=null;
  for(let i=0;i<ss.length-1;i++){const q=fn(ss[i]+(ss[i+1]-ss[i])*0.5);if(!q)continue;const r=Math.abs(I.footOn(off,q,new Map()).d);if(!worst||r>worst.r)worst={q,r,i};}
  const q=worst.q,b=off.basis;let u=-12.8276,v=v1;
  console.log('trace from clamped foot, segment',worst.i);
  for(let it=0;it<40;it++){
    const e=G.surfaceEval(b,u,v),r=sub(q,e.p),a=G.dot(e.du,e.du),bb=G.dot(e.du,e.dv),cc=G.dot(e.dv,e.dv),det=a*cc-bb*bb;
    const x=G.dot(r,e.du),y=G.dot(r,e.dv),su=(cc*x-bb*y)/det,sv=(a*y-bb*x)/det;
    if(it<12||it%5==0)console.log(it,'u',u.toFixed(6),'v',v.toFixed(6),'|su|',Math.abs(su).toExponential(1),'|sv|',Math.abs(sv).toExponential(1),'dist',G.norm(r).toExponential(6),'ds',G.norm(G.add(G.mul(e.du,su),G.mul(e.dv,sv))).toExponential(1));
    u+=su;v+=sv;}
}
