const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/container/'),modern=require(R+'modern'),ole=require(R+'ole'),H=require(R+'history'),zlib=require('zlib'),fs=require('fs');
for(const f of process.argv.slice(2)){const b=fs.readFileSync(f);let r;
 if(modern.isOLE2(b)){const o=ole.read(b),st=o.entries.filter(e=>e.type===2);r=H.saved(o.entries.map(e=>e.name),n=>o.stream(st.find(e=>e.name===n)));}
 else{const s=modern.decompressOpenSX(b,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));r=H.saved(Object.keys(s),n=>s[n]);}
 console.log(f.split('/').slice(-2).join('/').padEnd(48),r.version,r.release,r.error||'',r.history.map(h=>`${h.version}/${h.date&&h.date.year}-${h.date&&h.date.day}${h.created?'*':''}`).join(' '));}
