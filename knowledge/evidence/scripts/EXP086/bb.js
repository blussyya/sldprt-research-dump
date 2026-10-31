const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native');
const M=N.build(S.readBrep(process.argv[2]).parsed),e=M.edges.get(+process.argv[3]);let c=e.curve;if(c.type==='trimmed')c=c.basis;
const bb=c.surfaces.find(s=>s.type==='blendBound'),o=c.surfaces.find(s=>s!==bb),b=bb.blend;
const sh=s=>s.type+'#'+s.node+(s.type==='cylinder'?' r='+s.r+' a='+JSON.stringify(s.axis||s.a)+' p='+JSON.stringify(s.p||s.c):'')+(s.type==='offset'?' of '+sh(s.surface)+' d='+s.d:'');
console.log('bb',Object.keys(bb),'boundary',bb.boundary,'other',sh(o));
console.log('blend',b.blendType,b.range,b.senses,'sup',b.surfaces.map(sh).join(' | '));
