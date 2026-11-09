// EXP-112: does inflate use every compressed byte of a stream? A flipped bit 5 bytes before the
// end of one stream changed nothing, so count the bytes zlib leaves unread.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const m=require('/home/user/solidworks-converters/src/container/modern.js');
const root='/home/user/sldprt-research-dump';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(e.name!=='.git')walk(p,o);}else if(/\.sldprt$/i.test(e.name))o.push(p);}return o;}
const hist={},tails={};let n=0;const seen=new Set();
for(const f of walk(root)){const b=fs.readFileSync(f);if(m.isOLE2(b)||b[4]|b[5]|b[6])continue;const k=b.subarray(0,8).toString('hex');if(seen.has(k))continue;seen.add(k);
  for(const e of m.readDirectory(b)){const src=b.subarray(e.dataStart,e.dataStart+e.compSize);
    const r=zlib.inflateRawSync(src,{info:true});const left=e.compSize-r.engine.bytesWritten;n++;
    hist[left]=(hist[left]||0)+1;
    if(left>0){const t=src.subarray(src.length-left).toString('hex');tails[t]=(tails[t]||0)+1;}
  }}
console.log('streams',n,'unread compressed bytes -> count',JSON.stringify(hist));
console.log('distinct unread tails',Object.keys(tails).length,Object.entries(tails).sort((a,b)=>b[1]-a[1]).slice(0,6));
// control: a stream deflated here has 0 unread bytes; with 3 bytes appended, 3
const d=zlib.deflateRawSync(Buffer.from('control '.repeat(100)));
console.log('control',d.length-zlib.inflateRawSync(d,{info:true}).engine.bytesWritten,Buffer.concat([d,Buffer.alloc(3)]).length-zlib.inflateRawSync(Buffer.concat([d,Buffer.alloc(3)]),{info:true}).engine.bytesWritten);
