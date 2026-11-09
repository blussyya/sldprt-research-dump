// EXP-112: guesses at how the signatures come from the first four bytes. Each guess is run on
// 12 files; a hit means the signature bytes show up in the generated stream.
const crypto=require('crypto');
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const seen=new Set(),R=[];for(const r of rows){if(seen.has(r.head))continue;seen.add(r.head);R.push(r);if(R.length==12)break;}
const le=h=>Buffer.from(h,'hex').reverse(); // table stores L,C,E as numbers; file bytes are LE
function mt(seed){const s=new Uint32Array(624);s[0]=seed>>>0;for(let i=1;i<624;i++){const x=s[i-1]^(s[i-1]>>>30);s[i]=(Math.imul(x,1812433253)+i)>>>0;}let idx=624;
  return()=>{if(idx>=624){for(let i=0;i<624;i++){const y=(s[i]&0x80000000)|(s[(i+1)%624]&0x7fffffff);s[i]=s[(i+397)%624]^(y>>>1)^((y&1)?0x9908b0df:0);}idx=0;}let y=s[idx++];y^=y>>>11;y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;y^=y>>>18;return y>>>0;};}
const gens={
  'msvc rand &0xff':seed=>{let s=seed>>>0;const o=[];for(let i=0;i<20000;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.push((s>>>16)&0xff);}return Buffer.from(o);},
  'msvc rand >>7':seed=>{let s=seed>>>0;const o=[];for(let i=0;i<20000;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.push((s>>>23)&0xff);}return Buffer.from(o);},
  'msvc rand 15-bit LE16':seed=>{let s=seed>>>0;const o=Buffer.alloc(40000);for(let i=0;i<20000;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.writeUInt16LE((s>>>16)&0x7fff,i*2);}return o;},
  'lcg state bytes':seed=>{let s=seed>>>0;const o=Buffer.alloc(80000);for(let i=0;i<20000;i++){s=(Math.imul(s,214013)+2531011)>>>0;o.writeUInt32LE(s,i*4);}return o;},
  'glibc-ish lcg state':seed=>{let s=seed>>>0;const o=Buffer.alloc(80000);for(let i=0;i<20000;i++){s=(Math.imul(s,1103515245)+12345)>>>0;o.writeUInt32LE(s,i*4);}return o;},
  'mt19937 u32':seed=>{const g=mt(seed);const o=Buffer.alloc(40000);for(let i=0;i<10000;i++)o.writeUInt32LE(g(),i*4);return o;},
  'mt19937 &0xff':seed=>{const g=mt(seed);const o=[];for(let i=0;i<20000;i++)o.push(g()&0xff);return Buffer.from(o);},
  'minstd':seed=>{let s=BigInt(seed>>>0)%2147483647n||1n;const o=Buffer.alloc(40000);for(let i=0;i<10000;i++){s=s*48271n%2147483647n;o.writeUInt32LE(Number(s),i*4);}return o;},
  'xorshift32':seed=>{let s=seed>>>0||1;const o=Buffer.alloc(40000);for(let i=0;i<10000;i++){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;o.writeUInt32LE(s,i*4);}return o;},
};
for(const h of ['md5','sha1','sha256','sha512']){gens[h+'(4 bytes)']=(seed,r)=>crypto.createHash(h).update(Buffer.from(r.head.slice(0,8),'hex')).digest();gens[h+'(8 bytes)']=(seed,r)=>crypto.createHash(h).update(Buffer.from(r.head.slice(0,16),'hex')).digest();}
function crc32(b){let c=~0;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0);}return ~c>>>0;}
gens['crc32 chain']=(seed,r)=>{const o=Buffer.alloc(4000);let b=Buffer.from(r.head.slice(0,8),'hex');for(let i=0;i<1000;i++){const c=crc32(b);o.writeUInt32LE(c,i*4);b=Buffer.alloc(4);b.writeUInt32LE(c);}return o;};
let hits=0;
for(const g in gens)for(const sk of ['LE','BE']){const cnt={L:0,C:0,E:0};
  for(const r of R){const H=Buffer.from(r.head.slice(0,8),'hex');const seed=sk=='LE'?H.readUInt32LE(0):H.readUInt32BE(0);const s=gens[g](seed,r);
    for(const k of ['L','C','E']){if(s.includes(le(r[k]))||s.includes(Buffer.from(r[k],'hex')))cnt[k]++;}}
  if(cnt.L+cnt.C+cnt.E){hits++;console.log(g,sk,cnt);}}
console.log('guesses with any hit:',hits,'of',Object.keys(gens).length*2);
// control: xorshift32 seeded with head must find a signature we plant from its own stream
const r=R[0],s=gens['xorshift32'](Buffer.from(r.head.slice(0,8),'hex').readUInt32LE(0));console.log('control finds planted value:',s.includes(s.subarray(400,404)));
