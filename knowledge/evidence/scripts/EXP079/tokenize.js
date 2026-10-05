// Draft a field list for a stretch of an archive stream, for hand-checking: strings (ff fe ff n), "nice"
// doubles, and u32 otherwise, realigning with u8/u16 when a string or a double starts off the 4-byte step.
// Runs of zero words are folded into raw byte fields. usage: node tokenize.js FILE STREAMREGEX a z
const fs=require('fs');const P=require('../../../../package/src/parasolid/partition');
const nice=v=>v!==0&&Math.abs(v)>1e-9&&Math.abs(v)<1e7&&(Number(v.toPrecision(7))===v||Math.abs(v*1e9-Math.round(v*1e9))<1e-3);
function tokenize(b,a,z){
  const out=[];let p=a;
  const strAt=q=>b[q]===0xff&&b[q+1]===0xfe&&b[q+2]===0xff;
  const f64At=q=>q+8<=z&&nice(b.readDoubleLE(q));
  while(p<z){
    if(strAt(p)){const n=b[p+3];out.push(['str',JSON.stringify(b.subarray(p+4,p+4+2*n).toString('utf16le')),p]);p+=4+2*n;continue;}
    if(f64At(p)){out.push(['f64',b.readDoubleLE(p),p]);p+=8;continue;}
    let k=0;for(let d=1;d<4&&p+d<z;d++)if(strAt(p+d)||f64At(p+d)){k=d;break;}
    if(k===1||k===3){out.push(['u8',b[p],p]);p+=1;continue;}
    if(k===2){out.push(['u16',b.readUInt16LE(p),p]);p+=2;continue;}
    if(z-p<4){out.push(['u8',b[p],p]);p+=1;continue;}
    const v=b.readInt32LE(p);out.push([v<0?'i32':'u32',v,p]);p+=4;
  }
  // fold runs of 3+ zero u32 into raw bytes
  const f=[];for(let i=0;i<out.length;){if(out[i][0]==='u32'&&out[i][1]===0){let j=i;while(j<out.length&&out[j][0]==='u32'&&out[j][1]===0)j++;if(j-i>=3){f.push(['b'+4*(j-i),'0',out[i][2]]);i=j;continue;}}f.push(out[i]);i++;}
  return f;
}
if(require.main===module){const [file,re,a,z]=process.argv.slice(2);const s=P.streams(fs.readFileSync(file));const b=s[Object.keys(s).find(x=>new RegExp(re).test(x))];
  const t=tokenize(b,+a,+z);console.log(t.map(([k,v,p])=>(process.env.OFF?p+':':'')+k+(v!==undefined&&!k.startsWith('b')?' ='+v:'')).join(', '));}
module.exports={tokenize};
