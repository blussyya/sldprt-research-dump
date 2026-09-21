// Is Block2 fully determined by the strip-length precursor, or does it carry
// anything independent? Read it raw, without relying on the parser's own gate.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const v1=require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');
const v2=require('/home/user/sldprt-research-dump/parser/v0.2/src/parser-core.js');
const iR=b=>zlib.inflateRawSync(Buffer.from(b)),iZ=b=>zlib.inflateSync(Buffer.from(b));
let strips=0,faces=0,viol=0,hdrOdd=0;const hdrs=new Set();
for(const base of ['test files original','test files new/SW2022']){
 const R=path.join('/home/user/sldprt-research-dump',base);
 const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(R);
 for(const f of files.sort()){
  const buf=fs.readFileSync(f); if(v1.isOLE2(buf))continue;
  const dl=Buffer.from(v1.findDisplayLists(buf,iR,iZ));
  const r=v2.parseSLDPRT(buf,iR,iZ); if(r.errors&&r.errors.length)continue;
  for(const fc of r.faces){
   faces++;
   const o=fc.offsets.block2;
   hdrs.add([dl.readUInt32LE(o),dl.readUInt32LE(o+4),dl.readUInt32LE(o+8)].join(','));
   const cnt=dl.readUInt32LE(o+12);
   if(cnt!==fc.stripLengths.length)hdrOdd++;
   for(let i=0;i<cnt;i++){
    strips++;
    const stored=dl.readUInt32LE(o+16+4*i);
    if(stored!==2*fc.stripLengths[i]-2)viol++;
   }
  }
 }
}
console.log(`faces ${faces}, strips ${strips}`);
console.log(`  Block2[i] != 2*L[i]-2          : ${viol}`);
console.log(`  Block2 count != strip count    : ${hdrOdd}`);
console.log(`  distinct Block2 headers (first 3 words): ${[...hdrs].join(' | ')}`);
console.log(`\n  => Block2 carries ${viol===0?'zero':'some'} information independent of the precursor.`);
