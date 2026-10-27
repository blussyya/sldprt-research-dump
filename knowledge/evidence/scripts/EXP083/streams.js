// List every stream of a part (name, size), modern or OLE2. Usage: node streams.js file [filter-regex]
const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/container/');
const modern=require(R+'modern'),ole=require(R+'ole'),zlib=require('zlib'),fs=require('fs');
const f=process.argv[2],re=process.argv[3]?new RegExp(process.argv[3],'i'):null,b=fs.readFileSync(f);
if(modern.isOLE2(b)){const o=ole.read(b);for(const e of o.entries)if(!re||re.test(e.name))console.log(e.type===2?'S':'D',e.size,e.name);}
else{const s=modern.decompressOpenSX(b,x=>zlib.inflateRawSync(x,{maxOutputLength:1<<28}),x=>zlib.inflateSync(x,{maxOutputLength:1<<28}));for(const k of Object.keys(s))if(!re||re.test(k))console.log('S',s[k].length,k);}
