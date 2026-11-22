// dump each blend's fitted spine (curve + reported error) from a repo
const mode=process.argv[2];const R=mode==='dev'?'/home/user/conv-dev':'/home/user/solidworks-converters';
const S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);const out={};
for(const id of [9821,10371,9931,10129,10349]){const fc=M.faces.find(x=>x.surface.type==='blend'&&x.surface.node===id);
  console.time(mode+id);const r=F.spineOf(fc.surface,1e-8);console.timeEnd(mode+id);
  out[id]={curve:r.curve,error:r.error};console.log(id,'reported',r.error,'ctrl',r.curve.ctrl.length);}
require('fs').writeFileSync('spines-'+mode+'.json',JSON.stringify(out));
