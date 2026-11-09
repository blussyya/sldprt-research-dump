// Identical-geometry check for tied candidates: rounded vertex set + every face's surface (type and
// frame, rounded to 1e-9) + edge count, from the procedural-resolved model. Also times build vs choose
// for 118a3cb0 (the 67 s HEAD call in sweep.js) so the cost is attributed.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const S=require('./variants/select_HEAD.js');
const N=require('/home/user/conv-dev/src/brep/native');
const MAX=128*1024*1024;
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:MAX}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:MAX})};
const rnd=x=>typeof x==='number'?(Math.abs(x)<1e-9?0:+x.toFixed(9)):Array.isArray(x)?x.map(rnd):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).filter(k=>!/^(id|_|ids|faces|edges)$/.test(k)).sort().map(k=>[k,rnd(x[k])])):x;
function sig(parsed){const {box,model}=S.brepBox(parsed);
  const verts=[...model.vertices.values()].map(v=>rnd(v.p).join(',')).sort();
  const faces=model.faces.map(f=>JSON.stringify(rnd(f.surface))).sort();
  return JSON.stringify({verts,faces,nF:model.faces.length,nE:model.edges.size});}
const sw='/home/user/sldprt-research-dump/test files new/SW2011/';
const body=(file,part)=>P.readBody(new Uint8Array(fs.readFileSync(file)),{},codec).parsed;
const pairs=[
 ['SW C00 vs C22',sw+'C00_cube_10mm/model.SLDPRT',sw+'C22_cube_sw2011_native/model.SLDPRT'],
 ['SW C13 vs C25',sw+'C13_cone/model.SLDPRT',sw+'C25_cone_sw2011_native/model.SLDPRT'],
 ['SW C04 vs C26',sw+'C04_cube_hole_5mm/model.SLDPRT',sw+'C26_cube_hole_sw2011_native/model.SLDPRT'],
 ['SW C04 vs C03 (control, must differ)',sw+'C04_cube_hole_5mm/model.SLDPRT',sw+'C03_cube_fillet_1mm/model.SLDPRT']];
for(const [label,a,b] of pairs){try{const sa=sig(body(a)),sb=sig(body(b));console.log(label,'identical:',sa===sb);}catch(e){console.log(label,'ERR',e.message);}}
// corpus tied files: pairs of partitions within one file
const corp=[['2016/629adcec_cut-z351-d1xl1.SLDPRT',['Contents/Config-0-Partition','Contents/Config-1-Partition','Contents/Config-4-Partition']],
 ['2016/70477058_mt-cut-z085-l1xb1-typ.SLDPRT',['Contents/Config-0-Partition','Contents/Config-1-Partition','Contents/Config-4-Partition']],
 ['2017/516a7dc5_Body1.sldprt',['Contents/Config-0-Partition','Contents/Config-1-Partition']],
 ['2017/afc71d14_Body2.sldprt',['Contents/Config-0-Partition','Contents/Config-1-Partition']]];
for(const [f,names] of corp){const raw=new Uint8Array(fs.readFileSync('/home/user/sldprt-research-dump/test files online/'+f));
  const all=P.streams(raw,codec);const sigs=names.map(n=>{const x=P.assemble(all,n,codec,{});return sig(x.parsed);});
  console.log(f,names.map(n=>n.split('/')[1]).join(' '),'all identical:',sigs.every(s=>s===sigs[0]));}
// timing attribution for 118a3cb0
const f118='/home/user/sldprt-research-dump/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT';
const raw=new Uint8Array(fs.readFileSync(f118));const all=P.streams(raw,codec);const prim=P.extractPrimary(raw,all,codec,{});
let t0=Date.now();const built=prim.candidates.map(n=>({name:n,...P.assemble(all,n,codec,{})}));const tb=Date.now()-t0;
t0=Date.now();const r=S.choose(raw,built,codec.inflateRaw,codec.inflate);const tc=Date.now()-t0;
console.log('118a3cb0 candidates',prim.candidates.length,'build ms',tb,'choose ms',tc,'pick',r.name);
