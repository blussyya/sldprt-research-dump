// annotate a byte range: strings (ff fe ff n), else 4-byte words with u32/f32 and 8-byte f64 hints
// node ann.js <file> <stream regex> a z
const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs');
const [f,re,a,z]=process.argv.slice(2);const s=P.streams(fs.readFileSync(f));const b=s[Object.keys(s).find(x=>new RegExp(re).test(x))];
let p=+a;const out=[];
while(p<+z){
  if(b[p]===0xff&&b[p+1]===0xfe&&b[p+2]===0xff){const n=b[p+3];out.push(`${p}: str "${b.subarray(p+4,p+4+2*n).toString('utf16le')}"`);p+=4+2*n;continue;}
  if(b[p]===0xff&&b[p+1]===0xff&&b[p+2]<16&&b[p+3]===0&&b[p+5]===0&&b[p+6]>0x40){const n=b[p+4];out.push(`${p}: CLASS ${b.subarray(p+6,p+6+n).toString('latin1')}`);p+=6+n;continue;}
  const u=b.readUInt32LE(p),fl=b.readFloatLE(p),d=p+8<=b.length?b.readDoubleLE(p):NaN;
  let h=b.subarray(p,p+4).toString('hex');let note='u32 '+u+(u>0x7fffffff?' i32 '+(u|0):'');
  if(Math.abs(fl)>1e-6&&Math.abs(fl)<1e7&&u!==0)note+='  f32 '+fl.toPrecision(6);
  if(Math.abs(d)>1e-9&&Math.abs(d)<1e7)note+='  f64 '+d.toPrecision(8);
  out.push(`${p}: ${h}  ${note}`);p+=4;}
console.log(out.join('\n'));
