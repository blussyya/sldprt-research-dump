// What sits where an id/tag block would be, in the first record with the claimed odd tag in each named part.
const L=require('./lib');const R='/home/user/sldprt-research-dump/test files online/';
const P=[['0739c559','2015/0739c559_[HEAD-COVR-MIL1-COMN-00] Facemask & Mouthguard (Master).SLDPRT',4980815],['7765d286','2019/7765d286_NSJ8L.SLDPRT',16368],['eefa906d','2018/eefa906d_plancher Dalle 2020.SLDPRT',65536]];
for(const [k,p,t] of P){const b=L.dlBytes(R+p);for(const x of L.scan(b)){const m=L.meta(b,x);if(m.tag!==t)continue;
  const q=m.resOff+12,end=q+160;const u16=b.slice(q,end).toString('utf16le').replace(/[^\x20-\x7eЀ-ӿ]/g,'.');
  console.log(k,'record@',x.off,'words after normals(+scalar):',m.res.join(','),'\n  hex@id-block:',b.slice(q,q+40).toString('hex'),'\n  utf16le(160B):',JSON.stringify(u16),'\n  ascii(160B):',JSON.stringify(b.slice(q,end).toString('latin1').replace(/[^\x20-\x7e]/g,'.')));break;}}
console.log('4980815 bytes LE:',Buffer.from(new Uint32Array([4980815]).buffer).toString('hex'),'-> utf16le', Buffer.from(new Uint32Array([4980815]).buffer).toString('utf16le'));
