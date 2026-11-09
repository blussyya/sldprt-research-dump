// EXP-103: capture a failing corrector call (non-convergence) during a whole-part resolve and show both feet.
// usage: node diag3.js <part>
const path=require('path'),Module=require('module'),fs=require('fs');
const R=process.env.CONV||'/home/user/solidworks-converters';
const fp=R+'/src/brep/fit.js';
const m=new Module(fp,module);m.filename=fp;m.paths=Module._nodeModulePaths(path.dirname(fp));
let src=fs.readFileSync(fp,'utf8').replace('return {interp,','return {_i:{footOn},interp,');
const key="  if(!lm&&(step>FOOT_BAR||miss>FOOT_BAR))throw";
if(!src.includes(key))throw Error('hook line missing');
src=src.replace(key,"  if(!lm&&(step>FOOT_BAR||miss>FOOT_BAR))globalThis.__bad={X,g,T,S1,S2,cache,step,miss};\n"+key);
m._compile(src,fp);
const F=m.exports,G=require(R+'/src/geom/eval');
const S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural');
// procedural requires its own copy of fit.js; load it through our hooked module
require.cache[require.resolve(R+'/src/brep/fit')]={id:fp,filename:fp,loaded:true,exports:F};
delete require.cache[require.resolve(R+'/src/brep/procedural')];
const P2=require(R+'/src/brep/procedural');
try{P2.resolve(N.build(S.readBrep(process.argv[2]).parsed));console.log('no throw');}catch(e){console.log('threw',e.message);}
const b=globalThis.__bad;if(!b)process.exit();
console.log('X',b.X,'g',b.g,'step',b.step,'miss',b.miss);
for(const s of [b.S1,b.S2]){const a=F._i.footOn(s,b.X,b.cache);console.log(s.type+s.node,'d',a.d,'sideways',G.norm(G.sub(G.sub(b.X,a.q),G.mul(a.n,a.d))),'cache',JSON.stringify(b.cache.get(s)));
 if(s.type==='blend'){console.log('  blend range',s.range,'spine',s.spine.type);}}
