const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const M=require(R+'container/modern'),Z=require(R+'inflate');const fs=require('fs');
const f=process.argv[2];const s=M.decompressOpenSX(fs.readFileSync(f),Z.inflateRaw||Z.raw,Z.inflateZlib||Z.zlib);
for(const [k,v] of Object.entries(s))if(/display/i.test(k)){console.log(k,v.length,Buffer.from(v.subarray(0,32)).toString('hex'));if(process.argv[3])fs.writeFileSync(process.argv[3]+'.'+k.replace(/\W/g,'_'),v);}
