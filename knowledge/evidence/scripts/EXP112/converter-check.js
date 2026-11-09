// EXP-112: the converter's directory reader against its own scan, on every modern file in the
// dump. Same names in the same order, same bytes. Also times both.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const m=require('/home/user/solidworks-converters/src/container/modern.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
let files=0,same=0,noDir=0,tD=0,tS=0,streams=0;
for(const f of walk(root)){const b=fs.readFileSync(f);if(m.isOLE2(b)||b[4]|b[5]|b[6])continue;files++;
  let t=process.hrtime.bigint();const dir=m.readDirectory(b);if(!dir){noDir++;console.log('no directory',f);continue;}
  const a=m.decompressOpenSX(b,zlib.inflateRawSync,zlib.inflateSync);tD+=Number(process.hrtime.bigint()-t);
  t=process.hrtime.bigint();const s=m.scanOpenSX(b,zlib.inflateRawSync,zlib.inflateSync);tS+=Number(process.hrtime.bigint()-t);
  const ka=Object.keys(a),ks=Object.keys(s);streams+=ka.length;
  if(ka.join('\n')===ks.join('\n')&&ka.every(k=>Buffer.from(a[k]).equals(Buffer.from(s[k]))))same++;else console.log('DIFFERS',f);
}
console.log('modern files',files,'identical to scan (names, order, bytes)',same,'no directory',noDir,'streams',streams);
console.log('time: directory',(tD/1e9).toFixed(2),'s  scan',(tS/1e9).toFixed(2),'s');
// control: a file cut in half has no directory and falls back to the scan without throwing
const b=fs.readFileSync(root+'/test files original/cube.SLDPRT');const half=b.subarray(0,b.length>>1);
console.log('control, truncated file: directory',m.readDirectory(half),'scan streams',Object.keys(m.decompressOpenSX(half,zlib.inflateRawSync,zlib.inflateSync)).length);
