// Overview of f666f342: display parse result, face 75/448 basics, readBrep source.
const R='/home/user/solidworks-converters',S=require(R+'/src');
const fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file);
const t0=Date.now();
const d=S.parse(buf);
console.log('format',d.format,'stream',d.stream,'faces',d.faces.length,'rejected',d.rejected.length,'warnings',d.warnings.length,'overlays',(d.overlays||[]).length,'ms',Date.now()-t0);
const wm={};for(const w of d.warnings){const k=w.message.slice(0,60);wm[k]=(wm[k]||0)+1;}console.log(wm);
const rm={};for(const w of d.rejected){const k=w.reason.slice(0,60);rm[k]=(rm[k]||0)+1;}console.log('rejected',rm);
for(const i of [75,448]){const f=d.faces[i];console.log(i,'off',f.offset,'V',f.vertexCount,'S',f.stripLengths.length,'controls',[...new Set(f.stripControls)],'cycles',f.boundaryCycles&&f.boundaryCycles.length,'err',f.boundaryError,'meta',!!f.metadata,f.metadataError,'b3nz',f.block3.filter(x=>x).length,'ids',[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].sort((a,b)=>a-b).join(','));}
