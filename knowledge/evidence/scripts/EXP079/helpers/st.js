// dump one logical stream from C22/C23/C24: node st.js <name-regex> [max]
const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs');
const T='/home/claude/sldprt-research-dump/test files new/';
const files={C22:T+'SW2011/C22_cube_sw2011_native/model.SLDPRT',C23:T+'SW2022/C23_cube_sw2011_to_2022/model.SLDPRT',C24:T+'SW2022/C24_cube_sw2022_native/model.SLDPRT'};
const re=new RegExp(process.argv[2]),max=+(process.argv[3]||512);
for(const [k,f] of Object.entries(files)){const s=P.streams(fs.readFileSync(f));for(const n of Object.keys(s).filter(x=>re.test(x))){const b=s[n];console.log('==',k,n,b.length);
for(let o=0;o<Math.min(b.length,max);o+=32){const x=b.subarray(o,Math.min(o+32,b.length));console.log(String(o).padStart(6),x.toString('hex').replace(/(....)/g,'$1 ').padEnd(80),x.toString('latin1').replace(/[^\x20-\x7e]/g,'.'));}}}
