'use strict';
// Control: slide an 8-byte FILETIME window over every offset of the 54-byte tail, both word orders, and count how often it lands
// inside [ModelStamps, last Biography snapshot] for modelled features. Only offset 46, hi/lo, should pass.
const sv=require('./out/survey_all.json');
const {nodes}=require('./survey_nodes');
const MODEL=new Set(['moProfileFeature_c','moExtrusion_c','moICE_c','moRevolution_c','Fillet_c','Chamfer_c','moShell_c','moBlend_c','moPLine_c','moCirPattern_c']);
const E=11644473600;const res={};let n=0;
const ft=(hi,lo)=>Number((BigInt(hi)<<32n|BigInt(lo))/10000000n)-E;
for(const r of sv){if(!r.nodes||r.modelStamps===undefined)continue;const bio=(r.bio||[]).filter(t=>t>9.5e8);if(!bio.length)continue;const hiB=Math.max(...bio);
 const rows=nodes('/home/user/sldprt-research-dump/'+r.file).rows.filter(x=>MODEL.has(x.cls));
 for(const x of rows){const b=Buffer.from(x.tail,'hex');n++;
  for(let o=0;o+8<=54;o++){for(const [nm,hi,lo] of [['hi/lo',b.readUInt32LE(o),b.readUInt32LE(o+4)],['lo/hi',b.readUInt32LE(o+4),b.readUInt32LE(o)]]){
   const t=ft(hi,lo);const k=o+' '+nm;res[k]=(res[k]||0)+(t>=r.modelStamps&&t<=hiB+1?1:0);}}}}
console.log('modelled features',n);console.log(Object.entries(res).filter(e=>e[1]>0));
