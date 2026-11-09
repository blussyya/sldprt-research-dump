// EXP-112: does any 4-byte window near the start or end of the file encode where the real
// end-of-directory record is (its offset, its offset - 8, or its distance from the end)?
// GF(2)-affine test per output bit; only bits that vary across files are counted.
const fs=require('fs');const root='/home/user/sldprt-research-dump/';
const rows=JSON.parse(fs.readFileSync(__dirname+'/table.json'));
const seen=new Set(),R=[];for(const r of rows){if(seen.has(r.head))continue;seen.add(r.head);const b=fs.readFileSync(root+r.f);R.push({b,at:r.at,end:r.size-r.at,size:r.size,L:parseInt(r.L,16),C:parseInt(r.C,16),E:parseInt(r.E,16)});}
function gf2(xs,ys){let ok=0,vary=0;for(let bit=0;bit<32;bit++){const yb=ys.map(y=>(y>>>bit)&1);if(new Set(yb.slice(0,100)).size<2)continue;vary++;
  const M=xs.slice(0,100).map((x,i)=>BigInt(x>>>0)|(1n<<32n)|(yb[i]?1n<<33n:0n));let rank=0;
  for(let col=0;col<33;col++){let p=-1;for(let i=rank;i<M.length;i++)if((M[i]>>BigInt(col))&1n){p=i;break;}if(p<0)continue;[M[rank],M[p]]=[M[p],M[rank]];for(let i=0;i<M.length;i++)if(i!==rank&&((M[i]>>BigInt(col))&1n))M[i]^=M[rank];rank++;}
  let c=true;for(let i=rank;i<M.length;i++)if(M[i]!==0n)c=false;if(c)ok++;}return ok+'/'+vary;}
const targets={at:r=>r.at,atm8:r=>r.at-8,fromEnd:r=>r.end,L:r=>r.L,C:r=>r.C,E:r=>r.E};
const wins=[];for(let o=0;o<=28;o++)wins.push(['head+'+o,r=>r.b.readUInt32LE(o)]);for(let o=4;o<=40;o++)wins.push(['end-'+o,r=>r.b.readUInt32LE(r.size-o)]);
let any=false;
for(const [wn,wf] of wins){const xs=R.map(wf);for(const tn in targets){const res=gf2(xs,R.map(targets[tn]));const [a,b]=res.split('/').map(Number);if(a>0){any=true;console.log(wn,'->',tn,res);}}}
console.log(any?'':'no window gives a single consistent bit for any target');
// control: plant at^0x5a5a5a5a at head+0 and confirm the test finds it
console.log('control:',gf2(R.map(r=>(r.at^0x5a5a5a5a)>>>0),R.map(r=>r.at)));
