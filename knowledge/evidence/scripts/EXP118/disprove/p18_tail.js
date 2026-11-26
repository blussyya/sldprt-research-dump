// The undecoded legacy tail after each face's bounding record: does it hold u32 values equal to the
// native or the display edge ids, or the native face id? Done for faces 75 and 448 and, as a
// control, over every face: count tails that contain the face's own Block1 ids, and the ids -1/+1.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const u32s=t=>{const out=new Map();const b=Buffer.from(t);for(let o=0;o+4<=b.length;o++){const v=b.readUInt32LE(o);if(!out.has(v))out.set(v,[]);out.get(v).push(o);}return out;};
for(const di of [75,448]){const f=d.faces[di];const t=f.legacyTail;const m=u32s(t);
  const ids=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))];
  console.log('face',di,'tail bytes',t.length,'ascii',Buffer.from(t).toString('latin1').replace(/[^\x20-\x7e]/g,'.').slice(0,200));
  for(const v of [...ids,...ids.map(x=>x-1),...ids.map(x=>x+1),2516,12990,12997,2521])if(m.has(v))console.log('  u32',v,'at',m.get(v).join(','));}
let has0=0,hasM=0,hasP=0,n=0;
d.faces.forEach(f=>{const m=u32s(f.legacyTail),ids=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))];if(!ids.length)return;n++;
  if(ids.every(x=>m.has(x)))has0++;if(ids.every(x=>m.has(x-1)))hasM++;if(ids.every(x=>m.has(x+1)))hasP++;});
console.log('faces',n,'tails containing all own Block1 ids',has0,'all ids-1',hasM,'all ids+1',hasP);
