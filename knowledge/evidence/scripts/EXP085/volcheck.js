// The exact volume of each part about two origins, plus the reference it should match.
// On a closed shell the volume doesn't depend on the origin; a change means faces that don't meet.
//   node volcheck.js <part.SLDPRT>[::reference mm³] ... [--origin x,y,z (mm)]
const C='../../../../../solidworks-converters/src/';
const S=require(C),N=require(C+'brep/native'),P=require(C+'brep/procedural'),V=require(C+'brep/volume'),fs=require('fs');
const args=process.argv.slice(2),oi=args.indexOf('--origin');
const O=oi>=0?args.splice(oi,2)[1].split(',').map(x=>+x/1000):[0.1,0.1,0.1];
for(const a of args){const [f,ref]=a.split('::');
  const R=P.resolve(N.build(S.readBrep(fs.readFileSync(f)).parsed));
  const v0=V.volume(R).volume*1e9,v1=V.volume(R,{origin:O}).volume*1e9;
  console.log(f.split('/').pop().slice(0,40).padEnd(40),v0.toFixed(9),'moved',(v1-v0).toExponential(2),ref?'vs ref '+((v0-ref)/ref).toExponential(2):'');}
