// EXP-112: is the file's first u32 a checksum of the rest? CRC-32 and Adler-32 over a few spans.
const fs=require('fs'),zlib=require('zlib');const rows=JSON.parse(fs.readFileSync(__dirname+'/table.json'));
let hit=0,n=0;const seen=new Set();
for(const r of rows){if(seen.has(r.head))continue;seen.add(r.head);if(n++>=20)break;const b=fs.readFileSync('/home/user/sldprt-research-dump/'+r.f);
  const H=[b.readUInt32LE(0),b.readUInt32BE(0)];
  const spans={'4..end':b.subarray(4),'8..end':b.subarray(8),'8..eocd':b.subarray(8,r.at),'8..eocd+22':b.subarray(8,r.at+22),'4..eocd':b.subarray(4,r.at)};
  for(const k in spans){const c=zlib.crc32(spans[k])>>>0;if(H.includes(c)){hit++;console.log('crc32',k,r.f);}
    let a=1,s=0;for(const x of spans[k]){a=(a+x)%65521;s=(s+a)%65521;}const ad=((s<<16)|a)>>>0;if(H.includes(ad)){hit++;console.log('adler',k,r.f);}}
  for(const k of ['L','C','E']){const v=parseInt(r[k],16);const le=Buffer.alloc(4);le.writeUInt32LE(v);let idx=b.indexOf(le),c=0;while(idx>=0){c++;idx=b.indexOf(le,idx+1);} if(n<=3)console.log(r.f.slice(-30),k,'occurrences in file',c,'entries',r.n);}
}
console.log('checksum hits',hit,'in 20 files');
console.log('control crc32("123456789") =',(zlib.crc32(Buffer.from('123456789'))>>>0).toString(16),'(expect cbf43926)');
