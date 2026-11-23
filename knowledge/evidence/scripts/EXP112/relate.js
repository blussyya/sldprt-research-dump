// EXP-112: is any signature a simple function of the file's first four bytes, or of another
// signature? Tests: affine over GF(2) (covers xor, rotations, shifts, CRC-like and LFSR steps),
// and a*x+c mod 2^32. Fit on half the distinct files, check on the other half.
const rows=JSON.parse(require('fs').readFileSync(__dirname+'/table.json'));
const seen=new Set(),R=[];for(const r of rows){if(seen.has(r.head))continue;seen.add(r.head);
  const H=Buffer.from(r.head,'hex');R.push({H:H.readUInt32LE(0),Hb:H.readUInt32BE(0),L:parseInt(r.L,16),C:parseInt(r.C,16),E:parseInt(r.E,16)});}
console.log('distinct files',R.length);
function gf2(xk,yk){ // solve y = A x ^ c bitwise: for each output bit, a 33-unknown linear system
  const train=R.slice(0,100),test=R.slice(100);let okBits=0;const preds=[];
  for(let bit=0;bit<32;bit++){
    // rows: [x bits(32), 1 | ybit] as BigInt
    const m=train.map(r=>{let v=BigInt(r[xk]>>>0)|(1n<<32n);if((r[yk]>>>bit)&1)v|=1n<<33n;return v;});
    let piv=[],rank=0;const M=m.slice();
    for(let col=0;col<33;col++){let p=-1;for(let i=rank;i<M.length;i++)if((M[i]>>BigInt(col))&1n){p=i;break;}
      if(p<0)continue;[M[rank],M[p]]=[M[p],M[rank]];for(let i=0;i<M.length;i++)if(i!==rank&&((M[i]>>BigInt(col))&1n))M[i]^=M[rank];piv.push(col);rank++;}
    let consistent=true;for(let i=rank;i<M.length;i++)if(M[i]!==0n)consistent=false;
    if(consistent)okBits++;
  }
  return okBits;
}
function lcg(xk,yk){const a=R[0],b=R[1],c=R[2];let hit=0;
  // y1-y0 = A (x1-x0): check proportionality on a third sample via odd-difference inverse when possible
  const dx=(b[xk]-a[xk])>>>0,dy=(b[yk]-a[yk])>>>0;const dx2=(c[xk]-a[xk])>>>0,dy2=(c[yk]-a[yk])>>>0;
  // A*dx=dy and A*dx2=dy2 -> dy*dx2 == dy2*dx mod 2^32
  return (Math.imul(dy,dx2)>>>0)===(Math.imul(dy2,dx)>>>0);
}
for(const [x,y] of [['H','L'],['H','C'],['H','E'],['Hb','L'],['Hb','C'],['Hb','E'],['L','C'],['L','E'],['C','E'],['C','L'],['E','L'],['E','C']])
  console.log(x,'->',y,'GF(2)-affine consistent output bits (100 files, 33 unknowns):',gf2(x,y),'/32','| mod-2^32 linear:',lcg(x,y));
// control: a made-up affine map must come out 32/32
for(const r of R){r.T=((r.H<<7|r.H>>>25)^(r.H>>>3)^0xdeadbeef)>>>0;r.U=(Math.imul(r.H,1103515245)+12345)>>>0;}
console.log('control rot/shift/xor  H -> T:',gf2('H','T'),'/32');
console.log('control LCG            H -> U mod-linear:',lcg('H','U'),'gf2:',gf2('H','U'),'/32');
