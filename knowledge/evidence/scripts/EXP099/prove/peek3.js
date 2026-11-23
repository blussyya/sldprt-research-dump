const L=require('./lib'),D=require('/home/user/solidworks-converters/src/display.js');
const path=process.argv[2];const b=L.dlBytes(path);
const e=D.extractDisplayLists(new Uint8Array(b),false);
console.log('converter faces',e.faces.length,'rejected',e.rejected.length,'overlays',e.overlays.length,'meta',e.stats.metadataFaces);
const offs=new Set(e.faces.map(f=>f.offset));const sc=L.scan(b);console.log('my scan',sc.length,'in converter faces',sc.filter(x=>offs.has(x.off)).length);
for(const x of sc.slice(0,6)){const m=L.meta(b,x);console.log(x.off,offs.has(x.off),JSON.stringify(m));}
