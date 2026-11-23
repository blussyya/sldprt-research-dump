// EXP-103 (finish): edge 844 on head_back, from the captured input. Replays reanchor's constant-u
// case step for step (same section search, same anchors, same fn) and measures how far each
// vertex is from the point of fn it gets pinned in place of. Then fits three ways:
// both vertices pinned (what the converter does), neither pinned (ends on the curve), and the
// rule under test: pin a vertex only if it is within the bar of its end of the curve.
const R=process.env.CONV||'/home/user/solidworks-converters',F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const {c,p0,p1}=JSON.parse(require('fs').readFileSync(__dirname+'/../e844-capture.json','utf8'));
const S=c.surface,dist=G.dist,K=32,M=24,N=Math.max(8,c.c2.ctrl.length*2),tol=1e-8;
const [d,z]=G.curveRange(c.c2),vs=[];for(let i=0;i<=M;i++)vs.push(G.curvePoint(c.c2,d+(z-d)*i/M)[1]);
const vmin=Math.min(...vs),vmax=Math.max(...vs);
const nearest=(row,q)=>{let b=Infinity;for(const x of row)b=Math.min(b,dist(x,q));return b;};
const score=t=>{const row=[];for(let j=0;j<=K;j++)row.push(G.surfaceEval(S,t,j/K).p);return nearest(row,p0)+nearest(row,p1);};
let bt=0,bs=Infinity;for(let i=0;i<=64;i++){const s=score(i/64);if(s<bs){bs=s;bt=i/64;}}
let h=1/64;for(let i=0;i<40;i++){const s1=score(Math.max(0,bt-h/2)),s2=score(Math.min(1,bt+h/2));if(s1<bs){bs=s1;bt=Math.max(0,bt-h/2);}else if(s2<bs){bs=s2;bt=Math.min(1,bt+h/2);}h/=2;}
const anchors=q=>{let jA=0,dq=Infinity;for(let j=0;j<=K;j++){const s=dist(G.surfaceEval(S,bt,j/K).p,q);if(s<dq){dq=s;jA=j;}}
  let bv=jA/K,bq=dq;for(let w=-Math.ceil(K/2);w<=Math.ceil(K/2);w++){const v=Math.min(1,Math.max(0,jA/K+w/(K*K)));const s=dist(G.surfaceEval(S,bt,v).p,q);if(s<bq){bq=s;bv=v;}}return bv;};
const vA=anchors(p0),vB=anchors(p1),startV=G.curvePoint(c.c2,d)[1],fwd=(startV-vmin)*(vmax-vmin)>=0?vA<=vB:vB<=vA;
const a0=Math.min(vA,vB),a1=Math.max(vA,vB),ends=fwd?[p0,p1]:[p1,p0],fn=s=>G.surfaceEval(S,bt,a0+(a1-a0)*s).p;
// the true nearest point of the section to each vertex (fine search), to see if the anchor is the issue
const sect=v=>G.surfaceEval(S,bt,v).p,fine=q=>{let bv=0,bd=Infinity;for(let i=0;i<=8192;i++){const x=dist(sect(i/8192),q);if(x<bd){bd=x;bv=i/8192;}}let hh=1/8192;for(let k=0;k<50;k++){for(const v of [bv-hh,bv+hh]){if(v<0||v>1)continue;const x=dist(sect(v),q);if(x<bd){bd=x;bv=v;}}hh/=2;}return {v:bv,d:bd};};
console.log('section u',bt.toFixed(9),'anchors v',vA.toFixed(9),vB.toFixed(9),'fwd',fwd);
for(const [n,q,v] of [['p0',p0,vA],['p1',p1,vB]]){const f=fine(q);
  console.log(n,'to its anchor point',dist(sect(v),q).toExponential(3),'m | to the section (nearest, v',f.v.toFixed(9)+')',f.d.toExponential(3),'m');}
const ss=Array.from({length:N+1},(_,i)=>i/N);
const gap=[dist(fn(0),ends[0]),dist(fn(1),ends[1])];
const rule=[gap[0]<=tol?ends[0]:fn(0),gap[1]<=tol?ends[1]:fn(1)];
for(const [name,o] of [['both vertices pinned',{ends}],['ends on the curve',{}],['pin only within the bar',{ends:rule}]]){
  const r=F.fitPoints(fn,ss,tol,o);console.log(name.padEnd(24),'fit error',r.error.toExponential(3),'samples',r.samples);}
// How far each fitted curve gets from the section it should follow: 4001 points along the fit,
// each to its nearest point on the section (grid, then halving search). This sees a hook at the
// end that the fit's own error, measured from the section's points to the fit, can miss.
const toSect=q=>{let bv=0,bd=Infinity;for(let i=0;i<=512;i++){const x=dist(sect(i/512),q);if(x<bd){bd=x;bv=i/512;}}let hh=1/512;for(let k=0;k<45;k++){for(const v of [bv-hh,bv+hh]){if(v<0||v>1)continue;const x=dist(sect(v),q);if(x<bd){bd=x;bv=v;}}hh/=2;}return bd;};
// anchors refined to the vertex's nearest point on the section instead of a 1/1024 grid
const fineA=fine(p0).v,fineB=fine(p1).v,b0=Math.min(fineA,fineB),b1=Math.max(fineA,fineB),fn2=s=>G.surfaceEval(S,bt,b0+(b1-b0)*s).p;
const ends2=fwd?[p0,p1]:[p1,p0],rule2=[dist(fn2(0),ends2[0])<=tol?ends2[0]:fn2(0),dist(fn2(1),ends2[1])<=tol?ends2[1]:fn2(1)];
for(const [name,f,o] of [['both vertices pinned',fn,{ends}],['pin only within the bar',fn,{ends:rule}],['same, anchors refined',fn2,{ends:rule2}]]){
  const r=F.fitPoints(f,ss,tol,o),[x,y]=G.curveRange(r.curve);let w=0,at=0;
  for(let i=0;i<=4000;i++){const d=toSect(G.bsplineCurve(r.curve,x+(y-x)*i/4000).p);if(d>w){w=d;at=i/4000;}}
  const e0=G.bsplineCurve(r.curve,x).p,e1=G.bsplineCurve(r.curve,y).p;
  console.log(name.padEnd(24),'fit error',r.error.toExponential(3),'| fit to section max',w.toExponential(3),'at',at.toFixed(4),'| ends to their vertices',dist(e0,ends[0]).toExponential(3),dist(e1,ends[1]).toExponential(3));}
