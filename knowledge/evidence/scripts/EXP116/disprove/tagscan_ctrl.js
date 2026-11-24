// Positive control for the "tag 4001..4010 appears in no stream of a B file" scan: same scan on A and C files must find about one per face.
const L=require('./lib');const modern=require('/home/user/solidworks-converters/src/container/modern');
for(const rel of ['test files online/2025/e8f16581_Engine Base.SLDPRT','test files online/2024/346a04bc_R01_D_lower_1_140_washer_head.SLDPRT','test files online/2024/4febfc67_6344149.SLDPRT']){
  const f=L.ROOT+'/'+rel;const x=L.dlBytes(f);const st=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);
  const faces=L.faces(x.dl).faces.length;const tot={};
  for(const [n,b] of Object.entries(st)){const d=new DataView(b.buffer,b.byteOffset,b.byteLength);let c=0;for(let o=0;o+4<=b.length;o+=1){const v=d.getUint32(o,true);if(v>=4001&&v<=4010)c++;}if(c)tot[n]=c;}
  console.log(rel.split('/').pop(),'display faces',faces,'u32 4001..4010 (any byte offset) per stream',JSON.stringify(tot));
}
