// Own scan of f666f342's DisplayLists: every [4,8,2,S] candidate, read with lib.readFace,
// compared to the converter's face list; structure of the bytes between face records.
const L=require('./lib');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl,legacy}=L.dlBytes(F);
const conv=L.S.parse(F);
console.log('legacy',legacy,'DL bytes',dl.length,'converter faces',conv.faces.length);
const cands=[];for(let o=0;o+16<=dl.length;o++)if(dl.readUInt32LE(o)===4&&dl.readUInt32LE(o+4)===8&&dl.readUInt32LE(o+8)===2){const f=L.readFace(dl,o);if(f)cands.push(f);}
console.log('own full-record candidates',cands.length,'ok',cands.filter(f=>f.ok).length);
// Overlap: candidates whose start is inside another candidate (Block1/Block2 headers also match [4,8,2])
const starts=new Set(conv.faces.map(f=>f.offset));
const extra=cands.filter(c=>!starts.has(c.offset));
console.log('candidates not in converter list',extra.length,extra.slice(0,5).map(c=>c.offset));
const missing=conv.faces.filter(f=>!cands.some(c=>c.offset===f.offset));console.log('converter faces not found by own scan',missing.length);
// Compare geometry for every face
let diff=0;for(const f of conv.faces){const c=cands.find(c=>c.offset===f.offset);
  if(c.tris.length*3!==f.triangleIndices.length)diff++;else{for(let i=0;i<c.tris.length;i++)for(let j=0;j<3;j++)if(c.tris[i][j]!==f.triangleIndices[3*i+j]){diff++;i=1e9;break;}}}
console.log('faces whose own triangle list differs from converter',diff);
// what lies between each face record's Block3 end and the next face record: list array-like headers
function tail(i){const f=conv.faces[i],c=cands.find(c=>c.offset===f.offset),next=conv.faces[i+1]?conv.faces[i+1].offset:dl.length;
  const hs=[];for(let o=c.end;o+16<=next;o+=4){const h=L.hdr(dl,o);if(h[2]===2&&(h[1]===100||h[1]===8)&&[1,4,8,12,16,24].includes(h[0])&&o+16+h[0]*h[3]<=next)hs.push({rel:o-c.end,h});}
  return {face:i,end:c.end,next,gap:next-c.end,arrays:hs};}
for(const i of [74,75,76,447,448,449])console.log(JSON.stringify(tail(i)));
// gap-size distribution over all faces
const gaps={};for(let i=0;i<conv.faces.length;i++){const t=tail(i);const k=t.arrays.map(a=>a.h.slice(0,2).join('/')+'x'+a.h[3]).join(' ');gaps[k.replace(/x\d+/g,'')]=(gaps[k.replace(/x\d+/g,'')]||0)+1;}
console.log('array-header patterns in the gaps (all faces):',gaps);
