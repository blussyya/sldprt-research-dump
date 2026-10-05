// dump Config-0 bytes: node c0.js <file> a z
const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs');
const [f,a,z]=process.argv.slice(2);const s=P.streams(fs.readFileSync(f));const b=s[Object.keys(s).find(x=>/Config-0$/.test(x))];
for(let o=+a;o<Math.min(+z,b.length);o+=32){const x=b.subarray(o,Math.min(o+32,+z));console.log(String(o).padStart(6),x.toString('hex').replace(/(....)/g,'$1 ').padEnd(80),x.toString('latin1').replace(/[^\x20-\x7e]/g,'.'));}
