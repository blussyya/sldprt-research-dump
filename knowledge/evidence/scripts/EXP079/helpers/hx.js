const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');
const [f,a,z,st]=process.argv.slice(2);const b=P.streams(require('fs').readFileSync(f))['Contents/Config-'+(st||'0')+'-ResolvedFeatures'];
for(let o=+a;o<+z;o+=32){const s=b.subarray(o,Math.min(o+32,+z));console.log(String(o).padStart(6),s.toString('hex').replace(/(....)/g,'$1 '),s.toString('latin1').replace(/[^\x20-\x7e]/g,'.'));}
