const S=require(require('path').join(__dirname,'../../../../../solidworks-converters/src')),modern=require(require('path').join(__dirname,'../../../../../solidworks-converters/src/container/')+'modern'),ole=require(require('path').join(__dirname,'../../../../../solidworks-converters/src/container/')+'ole'),zlib=require('zlib'),fs=require('fs');
for(const f of process.argv.slice(2)){
  const b=fs.readFileSync(f);let names=[];
  if(modern.isOLE2(b)){const o=ole.read(b);names=o.entries.filter(e=>/hist|version|biog/i.test(e.name)).map(e=>e.name+' '+e.size);console.log('OLE',f.split('/').pop(),names);continue;}
  const s=modern.decompressOpenSX(b,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));
  const k=Object.keys(s).find(k=>/_MO_VERSION_\d+\/History$/.test(k));
  console.log(f.split('/').pop(),k,s[k]&&s[k].length);
  if(s[k])console.log(s[k].subarray(0,160).toString('hex').match(/.{1,64}/g).join('\n'));
}
