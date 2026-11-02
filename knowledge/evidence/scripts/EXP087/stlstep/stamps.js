const P=require('/home/user/conv-inspector/src/parasolid/partition.js'),fs=require('fs');
for(const f of process.argv.slice(2)){const all=P.streams(fs.readFileSync(f));console.log('==',f.split('/').pop());
  for(const [k,b] of Object.entries(all)){const n=k.replace(/^Contents\//,'');
    if(/ModelStamps|DLUpdateStamp/.test(n))console.log(' ',n,Buffer.from(b).toString('hex'),'u32le:',[...Array(Math.floor(b.length/4)).keys()].map(i=>Buffer.from(b).readUInt32LE(i*4)).join(','));
    if(/^(History|Biography)$/.test(n)){const s=Buffer.from(b).toString('latin1').replace(/[^\x20-\x7e]+/g,' | ');console.log(' ',n,s.slice(0,600));}}}
