// Hex of the legacy tail of a few faces, with the u32 at tail offset 82 (where face 75 has 2516).
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const d=S.parse(fs.readFileSync(file));
for(const di of (process.argv[3]||'75,448,0,1').split(',').map(Number)){const t=Buffer.from(d.faces[di].legacyTail);
  console.log('face',di,'len',t.length);for(let o=0;o<t.length;o+=32)console.log('  '+o.toString().padStart(3)+' '+t.subarray(o,o+32).toString('hex').replace(/(........)/g,'$1 '));
  if(t.length>=86)console.log('  u32@82',t.readUInt32LE(82),' f64@?');}
