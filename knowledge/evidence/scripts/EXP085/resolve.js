// per part: does the B-rep resolve, and the largest fit error
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),N=require(D+'brep/native'),P=require(D+'brep/procedural'),fs=require('fs');
for(const f of process.argv.slice(2)){const t=Date.now(),name=f.split('/').pop().slice(0,32).padEnd(32);
  try{const R=P.resolve(N.build(I.readBrep(fs.readFileSync(f)).parsed));console.log(name,'ok curve',R.report.errors.curve.toExponential(2),'surface',R.report.errors.surface.toExponential(2),(Date.now()-t)+'ms');}
  catch(e){console.log(name,'ERR',e.message.slice(0,90));}}
