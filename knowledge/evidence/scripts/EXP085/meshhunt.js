// For each part: every stream, and whether it holds tessellation class names or runs of float32 unit normals
const D=require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'/';
const I=require(D),M=require(D+'container/modern'),O=require(D+'container/ole'),fs=require('fs'),zlib=require('zlib');
const raw=b=>zlib.inflateRawSync(b),z=b=>zlib.inflateSync(b);
// count float32 triples that are unit vectors (normals) -- a mesh has thousands
function normals(b){let n=0;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);for(let i=0;i+12<=b.length;i+=4){const x=dv.getFloat32(i,true),y=dv.getFloat32(i+4,true),w=dv.getFloat32(i+8,true);const l=x*x+y*y+w*w;if(Math.abs(l-1)<1e-5&&Math.abs(x)<=1&&(x!==0||y!==0))n++;}return n;}
for(const f of process.argv.slice(2)){
  const b=fs.readFileSync(f);let st={};
  try{st=M.decompressOpenSX(b,raw,z);}catch(e){}
  if(!Object.keys(st).length){try{const o=O.read(b);for(const e of o.entries.filter(e=>e.type===2))st[e.name]=o.stream(e);}catch(e){}}
  console.log('== '+f.split('/').pop().slice(0,40),Object.keys(st).length,'streams');
  for(const [k,v] of Object.entries(st)){if(!v)continue;const s=Buffer.from(v);const tess=['TessData','uoTempBody','uoTempFace','Tessellat'].filter(t=>s.indexOf(t)>=0);const nn=normals(s);
    if(tess.length||nn>50)console.log('  ',k.padEnd(45),s.length,'tess:',tess.join(',')||'-','unit-normals:',nn);}
}
