const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters');
const S=require(R+'/src'),N=require(R+'/src/brep/native'),P=require(R+'/src/brep/procedural'),F=require(R+'/src/brep/fit');
const orig=F.edgeCurve;let last;
F.edgeCurve=function(e,c,p0,p1,o){last={id:e.id,type:c.type,surf:(c.surfaces||[c.surface]).map(s=>s&&s.type),p0,p1,ab:p0&&Math.hypot(p0[0]-p1[0],p0[1]-p1[1],p0[2]-p1[2]),chart:c.chart&&c.chart.length,sameSense:e.sameSense};
  try{return orig.apply(this,arguments)}catch(x){console.log('EDGE FAIL',JSON.stringify(last),x.message);throw x;}};
try{P.resolve(N.build(S.readBrep(process.argv[2]).parsed));console.log('ok')}catch(e){console.log('final',e.message)}
