const S=require('/home/user/conv-dev/src'),zlib=require('zlib'),fs=require('fs');
const R='/home/user/sldprt-research-dump/test files online/';
const f=process.argv[2],idx=+process.argv[3];
const buf=fs.readFileSync(R+f);
const d=S.parse(buf);
const dl=(()=>{const m=S.container.modern;const x=m.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib);return x;})();
const F=d.faces[idx],nx=d.faces[idx+1];
console.log('face',idx,'off',F.offset,'geomEnd',F.geometryEnd,'verts',F.vertexCount,'next',nx&&nx.offset,'gap',nx&&nx.offset-F.geometryEnd,'err',F.metadataError, 'dl len',dl.length);
const b=Buffer.from(dl);
function hex(a,n){for(let o=a;o<a+n;o+=16){console.log(o.toString().padStart(7),b.slice(o,Math.min(o+16,a+n)).toString('hex').replace(/(..)/g,'$1 '));}}
hex(F.geometryEnd,Math.min(nx?nx.offset-F.geometryEnd:600,640));
