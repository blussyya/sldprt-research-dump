const P=require(require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'parasolid/partition.js');
const fs=require('fs');const [f,a,n]=process.argv.slice(2);
const pr=P.extractPrimary(fs.readFileSync(f));const b=pr.inner;
let s=+a;const e=s+ +n;const dv=new DataView(b.buffer,b.byteOffset);
for(let o=s;o<e;o+=8){const h=Buffer.from(b.subarray(o,o+8)).toString('hex').replace(/(..)/g,'$1 ');console.log(o,h,o+8<=b.length?dv.getFloat64(o,false):'');}
