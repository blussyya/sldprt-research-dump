// EXP-103 (finish): edge 844 on head_back, from the captured input (../e844-capture.json).
// How far is each vertex from the curve that reanchor fits to (the fitted blend's line through
// both vertices), and what is the fit error with the far vertex pinned and with it left free?
const R=process.env.CONV||'/home/user/solidworks-converters',F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval');
const {c,p0,p1}=JSON.parse(require('fs').readFileSync(__dirname+'/../e844-capture.json','utf8'));
const S=c.surface,[d,z]=G.curveRange(c.c2);const us=[],vs=[];
for(let i=0;i<=24;i++){const q=G.curvePoint(c.c2,d+(z-d)*i/24);us.push(q[0]);vs.push(q[1]);}
const uSpan=Math.max(...us)-Math.min(...us),vSpan=Math.max(...vs)-Math.min(...vs);
console.log('2D curve u span',uSpan.toExponential(2),'v span',vSpan.toExponential(2),'surface uRange',S.uRange);
// the line reanchor uses: constant v (boundary) or constant u (section). Distance of each vertex to it, by dense search + refine.
// distance from q to the curve t -> f(t), t in [0,1]: grid, then halving search
const near=(f,q,n)=>{let bt=0,bd=Infinity;for(let i=0;i<=n;i++){const x=dist(f(i/n),q);if(x<bd){bd=x;bt=i/n;}}
  let h=1/n;for(let k=0;k<60;k++){for(const t of [bt-h,bt+h]){if(t<0||t>1)continue;const x=dist(f(t),q);if(x<bd){bd=x;bt=t;}}h/=2;}return {t:bt,d:bd};};
let line;
if(vSpan<1e-3)line=t=>G.surfaceEval(S,t,vs[0]).p;
else{ // constant u: the section through both vertices, u chosen to make the two distances smallest in sum
  const score=u=>near(v=>G.surfaceEval(S,u,v).p,p0,256).d+near(v=>G.surfaceEval(S,u,v).p,p1,256).d;
  const b=near(u=>[score(u),0,0],[0,0,0],256);const bu=b.t;
  console.log('section at u',bu.toFixed(9),'sum of vertex distances',score(bu).toExponential(3));
  line=v=>G.surfaceEval(S,bu,v).p;}
const distTo=q=>near(line,q,4096);
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
const a=distTo(p0),b=distTo(p1);
console.log('vertex p0 to the curve',a.d.toExponential(3),'m at t',a.t.toFixed(6),'| p1',b.d.toExponential(3),'m at t',b.t.toFixed(6));
const lo=Math.min(a.t,b.t),hi=Math.max(a.t,b.t),fn=s=>line(lo+(hi-lo)*s),ss=Array.from({length:17},(_,i)=>i/16);
const fwd=a.t<b.t;
for(const [name,ends] of [['both vertices pinned',fwd?[p0,p1]:[p1,p0]],['ends on the curve',null]]){
  const r=F.fitPoints(fn,ss,1e-8,ends?{ends}:{});console.log(name.padEnd(22),'fit error',r.error.toExponential(3),'samples',r.samples);}
