const P=require('/home/claude/sldprt-research-dump/package/src/parasolid/partition');const fs=require('fs'),crypto=require('crypto');
const T='/home/claude/sldprt-research-dump/test files new/';
const files={C22:T+'SW2011/C22_cube_sw2011_native/model.SLDPRT',C23:T+'SW2022/C23_cube_sw2011_to_2022/model.SLDPRT',C24:T+'SW2022/C24_cube_sw2022_native/model.SLDPRT'};
const S={};for(const [k,f] of Object.entries(files)){S[k]=P.streams(fs.readFileSync(f));}
const norm=n=>n.replace(/^Contents\//,'').replace(/^_MO_VERSION_\d+\//,'MOVER/').replace(/__ZLB$/,'').replace(/^ThirdPtyStore\//,'TPS/');
const h=b=>crypto.createHash('md5').update(b).digest('hex').slice(0,8);
const names=new Set();for(const k in S)for(const n in S[k])names.add(norm(n));
const row=(k,n)=>{const e=Object.entries(S[k]).find(([x])=>norm(x)===n);return e?[e[0],e[1].length,h(e[1])]:null;};
console.log('stream'.padEnd(34),'C22'.padEnd(26),'C23'.padEnd(26),'C24');
for(const n of [...names].sort()){const r=['C22','C23','C24'].map(k=>row(k,n));console.log(n.padEnd(34),...r.map(x=>(x?String(x[1]).padStart(6)+' '+x[2]:'-').padEnd(26)));}
for(const k in S)console.log(k,Object.keys(S[k]).join(' | '));
