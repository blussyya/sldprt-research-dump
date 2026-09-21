const fs=require('fs'),path=require('path'),zlib=require('zlib');
const v1=require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');
const v2=require('/home/user/sldprt-research-dump/parser/v0.2/src/parser-core.js');
const iR=b=>zlib.inflateRawSync(Buffer.from(b)),iZ=b=>zlib.inflateSync(Buffer.from(b));
const B='/home/user/sldprt-research-dump/test files new/SW2022';
const buf=fs.readFileSync(path.join(B,'C00_cube_10mm/model.SLDPRT'));
const dl=Buffer.from(v1.findDisplayLists(buf,iR,iZ));
const r=v2.parseSLDPRT(buf,iR,iZ);
console.log('C00 cube = [0,10]^3 mm = [0,0.01]^3 m. Per-face 132-byte prefix as f64 (metres):\n');
r.faces.forEach((f,i)=>{
 const p=dl.subarray(f.geometryEnd,f.geometryEnd+132);
 const d=[];for(let o=20;o+8<=84;o+=8)d.push(p.readDoubleLE(o));
 // actual face bbox from parsed vertices
 const v=f.vertices;const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
 for(let k=0;k<v.length;k+=3)for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],v[k+a]);mx[a]=Math.max(mx[a],v[k+a]);}
 console.log(` face${i} tag=${f.metadata?f.metadata.typeTag:'-'}`);
 console.log(`   prefix f64 @+20..+84 : ${d.map(x=>x.toFixed(6)).join(' ')}`);
 console.log(`   vertex bbox min/max  : ${mn.map(x=>x.toFixed(6)).join(' ')} / ${mx.map(x=>x.toFixed(6)).join(' ')}`);
});
