const L=require('./lib'),path=process.argv[2];
const b=L.dlBytes(path),r=L.scan(b);console.log(path,b.length,r.length);
for(const x of r.slice(0,3)){const o=x.norEnd;console.log(x.off,x.verts,[...Array(10).keys()].map(i=>b.readUInt32LE(o+4*i)).join(' '));}
