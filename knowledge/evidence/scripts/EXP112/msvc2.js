// EXP-112: every first-four-byte value is a window of the rand()&0xff stream. That stream only
// depends on the generator state mod 2^24. Recover that state for each key, then step the
// generator backwards and look for a step count at which all the states are small numbers
// (a small srand() seed).
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const keys=new Map();for(const r of rows){const k=r.head.slice(0,8);if(!keys.has(k))keys.set(k,r);}
const M=1<<24,A=214013,C=2531011;
const step=s=>(Math.imul(s,A)+C)&(M-1);
// inverse of A mod 2^24
let Ainv=1;for(let i=0;i<24;i++)Ainv=Math.imul(Ainv,2-Math.imul(A,Ainv))&(M-1);
const back=s=>Math.imul((s-C)&(M-1),Ainv)&(M-1);
// index: for every state s, the 4 bytes produced by the next 4 steps
const want=new Map();for(const [k,r] of keys)want.set(Buffer.from(k,'hex').readUInt32LE(0),k);
const state=new Map();
for(let s=0;s<M;s++){let x=s,v=0;for(let i=0;i<4;i++){x=step(x);v|=((x>>>16)&255)<<(8*i);}v>>>=0;if(want.has(v)){const k=want.get(v);(state.get(k)||state.set(k,[]).get(k)).push(s);}}
console.log('keys',keys.size,'found in the stream',state.size,'with more than one state',[...state.values()].filter(a=>a.length>1).length);
console.log('control: back(step(x))==x',back(step(1234567))===1234567);
for(let j=0;j<=4096;j++){
  const vals=[...state.values()].map(a=>{let s=a[0];for(let i=0;i<j;i++)s=back(s);return s;});
  const mx=Math.max(...vals);if(mx<(1<<17)||j<3)console.log('steps back',j,'max state',mx,'min',Math.min(...vals),'sample',vals.slice(0,8).join(','));
}
