// EXP-112: map everything from the end of the last stream's data to the end of the file.
const fs=require('fs');
const f=process.argv[2], b=fs.readFileSync(f), key=b[7]&7;
const rol=x=>((x<<key)|(x>>>(8-key)))&255;
const hex=(o,n)=>b.subarray(o,o+n).toString('hex').replace(/(..)/g,'$1 ');
const nm=(o,n)=>[...b.subarray(o,o+n)].map(x=>String.fromCharCode(rol(x))).join('');
const from=+process.argv[3];
let last=from;
for(let i=from;i+12<b.length;i++){
  if(!(b[i]==0x14&&b[i+1]==0&&b[i+2]==6&&b[i+3]==0&&b[i+4]==8&&b[i+5]==0)) continue;
  // central if 2 zero bytes before and name length at +22 fits; else local
  const cen=b[i-1]==0&&b[i-2]==0;
  const st=cen?i-6:i-4, nlo=cen?st+28:st+26, nl=b.readUInt16LE(nlo), len=(cen?46:30)+nl;
  console.log(st,cen?'C':'L','sig',hex(st,4),'gapBefore',st-last,'crc',b.readUInt32LE(st+(cen?16:14)).toString(16),'cs',b.readUInt32LE(st+(cen?20:18)),'us',b.readUInt32LE(st+(cen?24:22)),cen?'lho '+b.readUInt32LE(st+42):'',nm(st+(cen?46:30),nl));
  last=st+len;
}
console.log('rest',b.length-last,hex(last,b.length-last));
