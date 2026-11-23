// EXP-112: with each key's generator state known, look for the three signatures (and the stamp)
// in the rand()&0xff stream from 20,000 calls before the first-four bytes to 20,000 after.
// Also gcd of state differences at each step back (a seed of the form n*K+c would show K).
const fs=require('fs');const rows=JSON.parse(fs.readFileSync(__dirname+'/table.json'));
const states=JSON.parse(fs.readFileSync(__dirname+'/states.json'));
const keys=new Map();for(const r of rows){const k=r.head.slice(0,8);if(!keys.has(k))keys.set(k,r);}
const M=1<<24,A=214013,C=2531011;const step=s=>(Math.imul(s,A)+C)&(M-1);
let Ainv=1;for(let i=0;i<24;i++)Ainv=Math.imul(Ainv,2-Math.imul(A,Ainv))&(M-1);const back=s=>Math.imul((s-C)&(M-1),Ainv)&(M-1);
const W=20000;const pos={L:{},C:{},E:{}};let n=0;
for(const k in states){if(states[k].length!==1)continue;n++;let s=states[k][0];for(let i=0;i<W;i++)s=back(s);
  const st=Buffer.alloc(2*W);for(let i=0;i<2*W;i++){s=step(s);st[i]=(s>>>16)&255;}
  const r=keys.get(k);for(const t of ['L','C','E']){const le=Buffer.from(r[t],'hex').reverse();const p=st.indexOf(le);const rel=p<0?'none':p-W;pos[t][rel]=(pos[t][rel]||0)+1;}}
console.log('keys',n);for(const t in pos)console.log(t,'offset from first byte -> keys',JSON.stringify(Object.entries(pos[t]).sort((a,b)=>b[1]-a[1]).slice(0,6)));
