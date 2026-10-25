// list every offset in [a,z) where a "nice" f64 sits (|v| in 1e-6..1e7, few significant digits or common constants)
const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs');
const [f,re,a,z]=process.argv.slice(2);const s=P.streams(fs.readFileSync(f));const b=s[Object.keys(s).find(x=>new RegExp(re).test(x))];
for(let p=+a;p+8<=+z;p++){const v=b.readDoubleLE(p);if(v!==0&&Math.abs(v)>1e-7&&Math.abs(v)<1e7&&(Number(v.toPrecision(6))===v||Math.abs(v*1e6-Math.round(v*1e6))<1e-6))console.log(p,v);}
