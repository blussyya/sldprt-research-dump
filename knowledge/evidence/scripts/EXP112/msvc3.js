// EXP-112: which bits of the recovered generator state vary across keys, at each number of
// steps back? Few varying bits at some step = the seed.
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const keys=new Map();for(const r of rows){const k=r.head.slice(0,8);if(!keys.has(k))keys.set(k,r);}
const M=1<<24,A=214013,C=2531011;const step=s=>(Math.imul(s,A)+C)&(M-1);
let Ainv=1;for(let i=0;i<24;i++)Ainv=Math.imul(Ainv,2-Math.imul(A,Ainv))&(M-1);const back=s=>Math.imul((s-C)&(M-1),Ainv)&(M-1);
const want=new Map();for(const [k,r] of keys)want.set(Buffer.from(k,'hex').readUInt32LE(0),k);
const state=new Map();
for(let s=0;s<M;s++){let x=s,v=0;for(let i=0;i<4;i++){x=step(x);v|=((x>>>16)&255)<<(8*i);}v>>>=0;if(want.has(v)){const k=want.get(v);(state.get(k)||state.set(k,[]).get(k)).push(s);}}
const uniq=[...state.entries()].filter(e=>e[1].length===1);
console.log('keys with exactly one state',uniq.length);
const pop=x=>{let c=0;while(x){c+=x&1;x>>>=1;}return c;};
let cur=uniq.map(e=>e[1][0]);const res=[];
for(let j=0;j<=2000;j++){let or=0,and=M-1;for(const s of cur){or|=s;and&=s;}const vary=or&~and;res.push([j,pop(vary),vary.toString(2).padStart(24,'0'),new Set(cur).size]);cur=cur.map(back);}
res.sort((a,b)=>a[1]-b[1]);console.log('fewest varying bits (steps back, count, mask, distinct states):');for(const r of res.slice(0,5))console.log(r.join('  '));
console.log('missing key',[...keys.keys()].filter(k=>!state.has(k)));
const out={};for(const [k,v] of state)out[k]=v;require('fs').writeFileSync(__dirname+'/states.json',JSON.stringify(out));
