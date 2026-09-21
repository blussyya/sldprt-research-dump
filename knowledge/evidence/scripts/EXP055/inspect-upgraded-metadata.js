// Re-read the metadata record directly, bypassing v0.2's consistency gate, to
// see what the upgraded file actually stores where the tag and edge table live.
const fs=require('fs'),zlib=require('zlib');
const v2=require('/home/user/sldprt-research-dump/parser/v0.2/src/parser-core.js');
const v1=require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');
const iR=b=>zlib.inflateRawSync(Buffer.from(b)),iZ=b=>zlib.inflateSync(Buffer.from(b));
const B='/home/user/sldprt-research-dump/test files new';

function mk(b){const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const u=o=>d.getUint32(o,true),f64=o=>d.getFloat64(o,true);
 const arr=o=>{const h=[u(o),u(o+4),u(o+8),u(o+12)];return{h,end:o+16+h[0]*h[3]};};
 return{u,f64,arr};}

function meta(b,start){
 const r=mk(b);
 const a8=r.arr(start+132); const flag=r.u(a8.end);
 const pos=r.arr(a8.end+4); const nor=r.arr(pos.end);
 let o=nor.end; const sf=r.u(o); o+=4;
 if(sf===1){for(let i=0;i<2;i++){const a=r.arr(o);o=a.end;}}
 o+=12;
 const rawId=r.u(o); o+=28;
 const typeTag=r.u(o); const count=r.u(o+68);
 const recs=[];for(let i=0;i<count;i++)recs.push({id:r.u(o+72+i*8),t:r.u(o+76+i*8)});
 return{rawId,typeTag,count,recs,scalarFlag:sf,auxFlag:flag};
}

for(const [tag,p] of [
 ['C23 2011->2022',B+'/SW2022/C23_cube_sw2011_to_2022/model.SLDPRT'],
 ['C24 2022 native',B+'/SW2022/C24_cube_sw2022_native/model.SLDPRT']]){
 const buf=fs.readFileSync(p);
 const dl=v1.findDisplayLists(buf,iR,iZ);
 const r=v2.parseSLDPRT(buf,iR,iZ);
 console.log(`\n=== ${tag} ===`);
 r.faces.slice(0,3).forEach((f,i)=>{
  let m;try{m=meta(dl,f.geometryEnd);}catch(e){console.log(` face${i}: meta read failed: ${e.message}`);return;}
  const b1=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].sort((a,b)=>a-b);
  const md=[...new Set(m.recs.map(e=>e.id))].sort((a,b)=>a-b);
  console.log(` face${i}: tag=${m.typeTag} rawId=${m.rawId} count=${m.count}`);
  console.log(`         Block1 IDs   [${b1.join(',')}]`);
  console.log(`         metadata IDs [${md.join(',')}]  ${JSON.stringify(b1)===JSON.stringify(md)?'MATCH':'DIFFER'}`);
 });
}
