const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native');
const M=N.build(S.readBrep(process.argv[2]).parsed);let c=M.edges.get(21786).curve;if(c.type==='trimmed')c=c.basis;const s=c.surfaces[0];
console.log(Object.keys(s),JSON.stringify({...s,curve:undefined}));const k=s.curve;console.log(Object.keys(k),k.degree,k.knots||k.knotVec,k.ctrl.map(p=>p.map(x=>(x*1e3).toFixed(4)).join(',')).join(' | '),k.weights,k.periodic,k.closed);
