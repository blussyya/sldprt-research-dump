// EXP-112: find every end-of-directory candidate, test which one leads to a consistent directory,
// and print the per-file signatures next to the file's first bytes.
const fs=require('fs');
function analyse(f){
  const b=fs.readFileSync(f); if(b.length<64||b[0]==0xD0&&b[1]==0xCF) return null;
  if(!(b[4]==0&&b[5]==0&&b[6]==0)) return null;
  const out={file:f,size:b.length,head:b.subarray(0,16).toString('hex'),cands:[]};
  for(let i=4;i+18<=b.length;i++){
    if(b[i]|b[i+1]|b[i+2]|b[i+3]) continue;
    const n=b.readUInt16LE(i+4); if(!n||n!==b.readUInt16LE(i+6)) continue;
    if(b[i+16]|b[i+17]) continue;
    const size=b.readUInt32LE(i+8), off=b.readUInt32LE(i+12);
    const c={at:i-4,sig:b.subarray(i-4,i).toString('hex'),n,size,off,ok:false};
    // walk n central records from off+8
    let p=off+8, good=off+8+46<=b.length, csig=null, lsig=null;
    for(let k=0;k<n&&good;k++){
      if(p+46>b.length){good=false;break;}
      const s=b.readUInt32LE(p); if(csig===null) csig=s; else if(s!==csig) good=false;
      if(b.readUInt16LE(p+6)!==20||b.readUInt16LE(p+10)!==8) good=false;
      const lho=b.readUInt32LE(p+42); if(lho+38>b.length){good=false;break;}
      const ls=b.readUInt32LE(lho+8); if(lsig===null) lsig=ls; else if(ls!==lsig) good=false;
      p+=46+b.readUInt16LE(p+28)+b.readUInt16LE(p+30)+b.readUInt16LE(p+32);
    }
    if(good){c.ok=true;c.csig=csig.toString(16).padStart(8,'0');c.lsig=lsig.toString(16).padStart(8,'0');c.dirEnd=p;}
    out.cands.push(c);
  }
  return out;
}
module.exports=analyse;
if(require.main===module){const r=analyse(process.argv[2]);console.log(r.size,r.head);for(const c of r.cands)console.log(JSON.stringify(c));}
