// EXP-103: chart points of an edge vs both surfaces, with the normals' angle: is this a tangential contact with a real gap?
// usage: CONV=<repo> node gap.js part nodeA nodeB
const path=require('path'),Module=require('module'),fs=require('fs');
const R=process.env.CONV||'/home/user/solidworks-converters',fp=R+'/src/brep/fit.js';
const m=new Module(fp,module);m.filename=fp;m.paths=Module._nodeModulePaths(path.dirname(fp));
m._compile(fs.readFileSync(fp,'utf8').replace('return {interp,','return {_i:{footOn},interp,'),fp);
const foot=m.exports._i.footOn,S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const n=N.build(S.readBrep(process.argv[2]).parsed),want=[+process.argv[3],+process.argv[4]].sort().join();
for(const e of n.edges.values()){let c=e.curve;if(c.type==='trimmed')c=c.basis;
  if(c.type!=='intersection'||c.surfaces.map(s=>s.node).sort().join()!==want)continue;
  console.log('edge',e.id);
  for(const q of c.chart){const row=c.surfaces.map(s=>{const f=foot(s,q,new Map());return {d:f.d,n:f.n};});
    console.log(' chart pt: d1',row[0].d.toExponential(2),'d2',row[1].d.toExponential(2),'normal angle',Math.asin(Math.min(1,G.norm(G.cross(row[0].n,row[1].n)))).toExponential(2),'rad');}
}
