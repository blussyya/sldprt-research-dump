// EXP-116: mesh STEP report per part (analytic planes, faceted faces). Usage: node meshstep.js <converter dir> <parts...>
const fs=require('fs');for(const c of process.argv.slice(3)){}
const S=require(process.argv[2]+'/src'),C=require(process.argv[2]+'/src/convert');
for(const f of process.argv.slice(3)){const m=S.meshModel(f);const r=C.toSTEP(m,{name:'x',mode:'auto'}).report;
  console.log(require('path').basename(f).slice(0,22).padEnd(22),JSON.stringify({analyticPlanes:r.analyticPlanes,facetedFaces:r.facetedFaces,skippedLoops:r.skippedLoops,shell:r.shell}));}
