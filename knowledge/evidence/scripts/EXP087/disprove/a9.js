const {F,G,S1,S2,c,fs}=require('./common');
const poly=JSON.parse(fs.readFileSync('poly.json'));
const pts=JSON.parse(fs.readFileSync('pts4.json'));
const bad=pts.find(p=>Math.abs(p.s-0.0603)<2e-5);
const bs=S1.basis,d=S1.d;
function foot(X,near){const r=G.surfaceInverse(S1,X,near);const e=G.surfaceEval(S1,r.u,r.v);const n=G.unit(G.cross(e.du,e.dv));return {u:r.u,v:r.v,d:G.dot(G.sub(X,e.p),n)};}
// seed at segment start vertex
let run=new Map();const seeds=[];
for(let i=0;i<poly.length;i++){for(const S of [S1,S2]){const r=G.surfaceInverse(S,poly[i],run.get(S));run.set(S,{u:r.u,v:r.v});}seeds.push(new Map(run));}
const sd=seeds[bad.i-1].get(S1);console.log('seed uv',sd);
console.log('bad X foot with seed',foot(bad.X,sd),' unseeded',foot(bad.X));
// residual of the corrector's answer under the corrector's own foot
for(const sv of [sd,undefined]){console.log('sigma d from corrector-like foot',foot(bad.X,sv).d.toExponential(2));}
// a handful of guesses near bad
const T=G.unit(G.sub(poly[bad.i],poly[bad.i-1]));
for(const df of [-2e-3,-1e-3,-3e-4,0,3e-4,1e-3,2e-3]){const g=G.add(bad.g,G.mul(T,df));
  const X=F.corrector(S1,S2,g,T,new Map(seeds[bad.i-1]));const f1=foot(X,sd);
  console.log('guess shift',df,'X-bad',G.dist(X,bad.X).toExponential(2),'footd(seeded)',f1.d.toExponential(2),'uv',f1.u.toFixed(4),f1.v.toFixed(4),'footd(global)',foot(X).d.toExponential(2),'plane',G.dot(G.sub(X,S2.p),S2.n).toExponential(1));}
