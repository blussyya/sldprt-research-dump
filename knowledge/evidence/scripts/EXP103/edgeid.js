// EXP-103: fit one edge by id (raw surfaces) and print its surfaces, error and fit stats.  usage: CONV=<repo> node edgeid.js part edgeId
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const n=N.build(S.readBrep(process.argv[2]).parsed);const e=n.edges.get(+process.argv[3]);let c=e.curve;if(c.type==='trimmed')c=c.basis;
console.log('edge',e.id,c.type,c.surfaces?c.surfaces.map(s=>s.type+s.node).join(' x '):'','chart',c.chart&&c.chart.length);
const p0=e.v?n.vertices.get(e.v[0]).p:null,p1=e.v?n.vertices.get(e.v[1]).p:null;
const fp=new Map(n.faces.map(f=>[f.id,f]));
const t=Date.now();try{const r=F.edgeCurve(e,c,p0,p1,{tolerance:1e-8,faceOf:fp});console.log('error',r.error.toExponential(3),'ctrl',r.curve.ctrl.length,(Date.now()-t)/1e3,'s');}catch(x){console.log('threw',x.message);}
