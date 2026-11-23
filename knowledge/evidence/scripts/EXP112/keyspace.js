// EXP-112: unrelated files share their first four bytes, and then share all three signatures.
// How big is the set of first-four-byte values, and is each signature byte a function of one
// header byte?
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const files=new Map();for(const r of rows)files.set(r.head+r.size,r);           // distinct files
const F=[...files.values()],keys=new Map();for(const r of F){const k=r.head.slice(0,8);if(!keys.has(k))keys.set(k,r);}
const K=[...keys.values()];
let pairs=0;const cnt={};for(const r of F){const k=r.head.slice(0,8);cnt[k]=(cnt[k]||0)+1;}for(const k in cnt)pairs+=cnt[k]*(cnt[k]-1)/2;
console.log('distinct files',F.length,'distinct first-4-byte values',K.length,'colliding pairs',pairs,'=> set size about',Math.round(F.length*(F.length-1)/2/pairs));
const bytes=h=>h.match(/../g).map(x=>parseInt(x,16));
const le=h=>bytes(h).reverse();
const cols=K.map(r=>({H:bytes(r.head.slice(0,8)),L:le(r.L),C:le(r.C),E:le(r.E)}));
for(let i=0;i<4;i++)console.log('H byte',i,'distinct values',new Set(cols.map(c=>c.H[i])).size);
for(const t of ['L','C','E'])for(let j=0;j<4;j++){const res=[];
  for(let i=0;i<4;i++){const m=new Map();let ok=true,rep=0;for(const c of cols){const s=c.H[i],v=c[t][j];if(m.has(s)){rep++;if(m.get(s)!==v)ok=false;}else m.set(s,v);}res.push('H'+i+(ok?':FUNCTION('+rep+' repeats)':':no'));}
  console.log(t+j,'distinct',new Set(cols.map(c=>c[t][j])).size,res.join(' '));}
