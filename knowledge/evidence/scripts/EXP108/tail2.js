const fs=require('fs');const CONV='/home/user/conv-dev/src',S=require(CONV),modern=require(CONV+'/container/modern'),inflate=require(CONV);
const f=process.argv[2],i=+process.argv[3]||0;
const buf=new Uint8Array(fs.readFileSync(f));const st=modern.decompressOpenSX(buf,inflate.inflateRaw,inflate.inflateZlib);
const dl=st[Object.keys(st).find(k=>/DisplayLists/i.test(k))];const d=S.parse(f);
const a=d.faces[i],end=a.metadata.end,nx=d.faces[i+1]?d.faces[i+1].offset:dl.length;
const dv=new DataView(dl.buffer,dl.byteOffset,dl.byteLength);
console.log('edges',JSON.stringify(a.metadata.edgeRecords),'len',nx-end);
let o=end;const line=[];
while(o+4<=nx){const u=dv.getUint32(o,true);let s=String(u);if(o+8<=nx){const x=dv.getFloat64(o,true);if(Math.abs(x)>1e-9&&Math.abs(x)<1e4&&u!==0)s+='|d='+x;}
 line.push((o-end)+':'+s);o+=4;}
console.log(line.join('  '));
