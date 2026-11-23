// EXP-112: the first-four-byte values come from a set of about 1,000. Guess: a small seed drives
// a standard generator. For seeds 0..2^17 and several generators and packings, count how many of
// the 163 observed values appear in the first 48 outputs.
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const want=new Map();
for(const r of rows){const H=Buffer.from(r.head.slice(0,8),'hex');want.set(H.readUInt32LE(0),r);want.set(H.readUInt32BE(0),r);}
function mtGen(seed){const s=new Uint32Array(624);s[0]=seed>>>0;for(let i=1;i<624;i++){const x=s[i-1]^(s[i-1]>>>30);s[i]=(Math.imul(x,1812433253)+i)>>>0;}let idx=624;
  return()=>{if(idx>=624){for(let i=0;i<624;i++){const y=(s[i]&0x80000000)|(s[(i+1)%624]&0x7fffffff);s[i]=s[(i+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0);}idx=0;}let y=s[idx++];y^=y>>>11;y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;y^=y>>>18;return y>>>0;};}
const N=48;
const raw={
  msvc:seed=>{let s=seed>>>0;const o=[];for(let i=0;i<N;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.push((s>>>16)&0x7fff);}return o;},
  msvcState:seed=>{let s=seed>>>0;const o=[];for(let i=0;i<N;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.push(s);}return o;},
  ansiC:seed=>{let s=seed>>>0;const o=[];for(let i=0;i<N;i++){s=(Math.imul(s,1103515245)+12345)>>>0;o.push((s>>>16)&0x7fff);}return o;},
  ansiState:seed=>{let s=seed>>>0;const o=[];for(let i=0;i<N;i++){s=(Math.imul(s,1103515245)+12345)>>>0;o.push(s);}return o;},
  minstd:seed=>{let s=BigInt(seed%2147483647||1);const o=[];for(let i=0;i<N;i++){s=s*48271n%2147483647n;o.push(Number(s));}return o;},
  minstd0:seed=>{let s=BigInt(seed%2147483647||1);const o=[];for(let i=0;i<N;i++){s=s*16807n%2147483647n;o.push(Number(s));}return o;},
  xorshift:seed=>{let s=seed>>>0||1;const o=[];for(let i=0;i<N;i++){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;o.push(s);}return o;},
  mt:seed=>{const g=mtGen(seed);const o=[];for(let i=0;i<8;i++)o.push(g());return o;},
};
const packs={
  u32:o=>o.map(x=>x>>>0),
  bytesLo:o=>{const r=[];for(let i=0;i+3<o.length;i++)r.push(((o[i]&255)|((o[i+1]&255)<<8)|((o[i+2]&255)<<16)|((o[i+3]&255)<<24))>>>0);return r;},
  bytesHi:o=>{const r=[];for(let i=0;i+3<o.length;i++)r.push((((o[i]>>>7)&255)|(((o[i+1]>>>7)&255)<<8)|(((o[i+2]>>>7)&255)<<16)|(((o[i+3]>>>7)&255)<<24))>>>0);return r;},
  pair16:o=>{const r=[];for(let i=0;i+1<o.length;i++){r.push(((o[i]<<16)|(o[i+1]&0xffff))>>>0,((o[i]<<15)|o[i+1])>>>0,((o[i]&0xffff)|(o[i+1]<<16))>>>0);}return r;},
};
const MAX=1<<17;let best=[];
for(const g in raw)for(const p in packs){let hits=0;const ex=[];const lim=g==='mt'?1<<15:MAX;
  for(let s=0;s<lim;s++){for(const v of packs[p](raw[g](s)))if(want.has(v)){hits++;if(ex.length<3)ex.push(s);}}
  // chance level: tries * 326 / 2^32
  const tries=lim*packs[p](raw[g](1)).length;console.log(g,p,'hits',hits,'expected by chance',(tries*want.size/2**32).toFixed(2),ex.join(','));}
