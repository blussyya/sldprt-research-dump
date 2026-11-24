const L=require('./lib');const modern=require('/home/user/solidworks-converters/src/container/modern');
const f=L.ROOT+'/test files online/2020/7841a106_6344428.SLDPRT';
try{const M=L.S.brep.model(L.S.readBrep(f).parsed);console.log('native faces',M.faces.length);}catch(e){console.log('native error:',e.message);}
const x=L.dlBytes(f);const st=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);
let tot={};for(const [n,b] of Object.entries(st)){const d=new DataView(b.buffer,b.byteOffset,b.byteLength);let c=0;for(let o=0;o+4<=b.length;o+=4){const v=d.getUint32(o,true);if(v>=4001&&v<=4010)c++;}if(c)tot[n]=c;}
console.log('tags in 4001..4010 per stream',JSON.stringify(tot),'streams',Object.keys(st).length);
