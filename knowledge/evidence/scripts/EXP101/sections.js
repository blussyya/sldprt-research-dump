// Own section reader for SLDPRT stream bytes (written from the byte layout, not from the converter code).
// Layout seen in the bytes: u32 size | 16-byte GUID | per chunk: u32 inflated, u32 compressed, zlib[compressed] | 8 zero bytes.
// size = bytes after the size field, so the section ends at guid + size.
const zlib=require('zlib');
const GUID=Buffer.from('231dd571da8148a2a85898b21b89ef99','hex');
function sections(buf){
  const out=[];let from=0;
  for(;;){
    const g=buf.indexOf(GUID,from);if(g<0)break;
    const size=buf.readUInt32LE(g-4);
    const end=g+size;
    let p=g+16,parts=[];
    while(p+8<=end-8){
      const inf=buf.readUInt32LE(p),comp=buf.readUInt32LE(p+4);
      parts.push(zlib.inflateSync(buf.subarray(p+8,p+8+comp)));
      if(parts[parts.length-1].length!==inf)throw Error('inflated size mismatch at '+p);
      p+=8+comp;
    }
    out.push({at:g-4,size,end,payload:Buffer.concat(parts)});
    from=end;
  }
  return out;
}
module.exports={sections};
if(require.main===module){
  const fs=require('fs');
  const buf=fs.readFileSync(process.argv[2]);
  const secs=sections(buf);
  console.log(secs.map(s=>({at:s.at,size:s.size,end:s.end,len:s.payload.length})));
  if(process.argv[3]) fs.writeFileSync(process.argv[3],secs[0].payload);
}
