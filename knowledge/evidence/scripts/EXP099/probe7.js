const S=require('/home/user/conv-dev/src'),fs=require('fs');
const R='/home/user/sldprt-research-dump/test files online/';
const f=process.argv[2],idx=+process.argv[3],from=+process.argv[4],n=+process.argv[5];
const buf=fs.readFileSync(R+f),d=S.parse(buf);
const b=Buffer.from(S.container.modern.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));
const F=d.faces[idx];const base=F.geometryEnd;
console.log(f,'face',idx,'geomEnd',base,'meta',F.metadata&&F.metadata.offset,'err',F.metadataError, 'next',d.faces[idx+1]&&d.faces[idx+1].offset);
for(let o=base+from;o<base+from+n;o+=16)console.log('+'+(o-base).toString().padStart(4),b.slice(o,o+16).toString('hex').replace(/(..)/g,'$1 '));
