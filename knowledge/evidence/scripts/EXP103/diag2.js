// EXP-103: capture the corrector call that fails the foot check on a spine and compare its feet with a brute-force foot.
// usage: node diag2.js <part> <blend node>
const path=require('path'),Module=require('module'),fs=require('fs');
const R=process.env.CONV||'/home/user/solidworks-converters';
const fp=R+'/src/brep/fit.js';
const m=new Module(fp,module);m.filename=fp;m.paths=Module._nodeModulePaths(path.dirname(fp));
let src=fs.readFileSync(fp,'utf8').replace('return {interp,','return {_i:{polyFn,chartMarch,march,footOn,corrector,fitPoints},interp,');
src=src.replace("  if(off>FOOT_BAR)throw","  if(off>FOOT_BAR)globalThis.__bad={X,g,T,S1,S2,cache,off};\n  if(off>FOOT_BAR)throw");
m._compile(src,fp);
const I=m.exports._i,S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed);
const f=n.faces.find(f=>f.surface.node===+process.argv[3]);let c=f.surface.spine;if(c.type==='trimmed')c=c.basis;
const [S1,S2]=c.surfaces;const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
try{I.chartMarch(S1,S2,c.start.p,c.end.p,c.chart);console.log('no throw');}catch(e){console.log('threw',e.message);}
const b=globalThis.__bad;if(!b)process.exit();
console.log('X',b.X,'g',b.g,'off',b.off);
for(const S of [b.S1,b.S2]){
  const [[u0,u1],[v0,v1]]=G.surfaceRange(S.basis);const uv=b.cache.get(S);
  const a=I.footOn(S,b.X,b.cache),fo=G.norm(sub(sub(b.X,a.q),G.mul(a.n,a.d)));
  console.log(S.type+S.node,'d',S.d,'basis range u',u0.toFixed(3),u1.toFixed(3),'v',v0.toFixed(3),v1.toFixed(3),'foot uv',uv.u.toFixed(4),uv.v.toFixed(4),'|d|',Math.abs(a.d).toExponential(2),'sideways',fo.toExponential(2),
   'out of range: u',uv.u<u0||uv.u>u1,'v',uv.v<v0||uv.v>v1);
  // brute force: nearest point on the offset over the extended basis
  let best=null;const K=400;
  for(let i=0;i<=K;i++)for(let j=0;j<=K;j++){const u=u0-3+(u1-u0+6)*i/K,v=v0-3+(v1-v0+6)*j/K;const e=G.surfaceEval(S,u,v),d=G.dist(b.X,e.p);if(!best||d<best.d)best={u,v,d};}
  console.log('   brute-force nearest on extended offset: dist',best.d.toExponential(3),'at',best.u.toFixed(3),best.v.toFixed(3));
}
