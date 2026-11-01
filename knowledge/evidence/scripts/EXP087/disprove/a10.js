const {F,G,S1,S2,c,fs}=require('./common');
const {add,sub,mul,dot,cross,norm,unit}=G;
const poly=JSON.parse(fs.readFileSync('poly.json'));
const pts=JSON.parse(fs.readFileSync('pts4.json'));
const bad=pts.find(p=>Math.abs(p.s-0.0603)<2e-5);
let run=new Map();const seeds=[];
for(let i=0;i<poly.length;i++){for(const S of [S1,S2]){const r=G.surfaceInverse(S,poly[i],run.get(S));run.set(S,{u:r.u,v:r.v});}seeds.push(new Map(run));}
function footOn(s,p,cache){const near=cache&&cache.get(s);const r=G.surfaceInverse(s,p,near),e=G.surfaceEval(s,r.u,r.v);cache.set(s,{u:r.u,v:r.v});const n=unit(cross(e.du,e.dv));return {q:e.p,n,d:dot(sub(p,e.p),n),u:r.u,v:r.v};}
const T=unit(sub(poly[bad.i],poly[bad.i-1]));const cache=new Map(seeds[bad.i-1]);
let X=bad.g;
for(let it=0;it<40;it++){const a=footOn(S1,X,cache),b=footOn(S2,X,cache);const Fv=[a.d,b.d,dot(sub(X,bad.g),T)];
 const M=[a.n,b.n,T],det=dot(M[0],cross(M[1],M[2]));
 if(it>=30||it<5)console.log(it,'a.d',a.d.toExponential(2),'uv',a.u.toFixed(4),a.v.toFixed(4),'b.d',b.d.toExponential(1),'det',det.toExponential(2));
 const c0=cross(M[1],M[2]),c1=cross(M[2],M[0]),c2=cross(M[0],M[1]);
 const D=mul(add(add(mul(c0,Fv[0]),mul(c1,Fv[1])),mul(c2,Fv[2])),-1/det);X=add(X,D);console.log("   |D|",norm(D).toExponential(1));if(norm(D)<1e-16+1e-15*norm(X))break;}
console.log('final X-bad',G.dist(X,bad.X));
