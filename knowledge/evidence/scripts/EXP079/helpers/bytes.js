// space-separated bytes of one stream for C22/C23/C24, from offset a to b: node bytes.js <regex> [a] [b]
const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs');const T='/home/claude/sldprt-research-dump/test files new/';
const F={C22:T+'SW2011/C22_cube_sw2011_native/model.SLDPRT',C23:T+'SW2022/C23_cube_sw2011_to_2022/model.SLDPRT',C24:T+'SW2022/C24_cube_sw2022_native/model.SLDPRT'};
const re=new RegExp(process.argv[2]),a=+(process.argv[3]||0),z=+(process.argv[4]||1e9);
for(const [k,f] of Object.entries(F)){const s=P.streams(fs.readFileSync(f));const n=Object.keys(s).find(x=>re.test(x));if(!n){console.log(k,'-');continue;}const b=s[n].subarray(a,z);
let t='';for(let i=0;i<b.length;i++){const c=b[i];t+=(c>=0x30&&c<0x7b&&/[0-9A-Za-z_]/.test(String.fromCharCode(c)))?' '+String.fromCharCode(c)+'.':' '+c.toString(16).padStart(2,'0');}
console.log(k,n,s[n].length,'\n'+t.replace(/((?: [^ ]+){32})/g,'$1\n'));}
