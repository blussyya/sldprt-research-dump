// fit blends of faces 2312 and 2308 alone; compare with capture surface; save fitted 2308 surface
const R='/home/user/conv-dev',S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit');
const f="/home/user/sldprt-research-dump/test files online/2013/82981f2a_head_back.sldprt";
const M=N.build(S.readBrep(f).parsed);const out={};
for(const id of [2312,2308]){const fc=M.faces.find?M.faces.find(x=>x.id===id):M.faces.get(id);console.time('fit'+id);
  const r=F.blendSurface(fc.surface,fc,M,{tolerance:1e-8});console.timeEnd('fit'+id);
  console.log(id,'err',r.error,Object.keys(r.surface),'urange',r.surface.uRange,'radius',r.surface.radius,fc.surface.range,fc.surface.spine.type);out[id]=r.surface;}
require('fs').writeFileSync('surf-2312-2308.json',JSON.stringify(out));
const cap=require('../e844-capture.json').c.surface;
console.log('capture ctrl eq 2312 fit:',JSON.stringify(cap.ctrl)===JSON.stringify(out[2312].ctrl));
