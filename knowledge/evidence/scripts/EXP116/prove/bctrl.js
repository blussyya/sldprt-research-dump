'use strict';
// Control for "B records hold no tag": the same raw word scan on C and A records must find 4001-4010.
const L=require('./lib');const root='/home/user/sldprt-research-dump/test files online/';
for(const f of ['2026/c5784ab3_A09_power_and_compute_rack.SLDPRT','2025/50af9019_7x4 P42a Cell Holder.SLDPRT','2019/28398415_Raspberry Pi 4.SLDPRT']){
  const {dl}=L.dlOf(root+f);const R=L.rd(dl);const st=L.faceStarts(dl);let withTag=0;
  st.forEach((B,i)=>{const next=st[i+1]||dl.length;let h=0;for(let o=B;o<next-3;o+=4){const v=dl.readUInt32LE(o);if(v>=4001&&v<=4010)h++;}if(h)withTag++;});
  console.log(f,'records',st.length,'with a 4001-4010 word',withTag);
}
