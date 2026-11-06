// vol.js <file> [maxFacesDiff]: display mesh volume vs B-rep volume of every candidate whose face count equals the display's.
// Stronger check than box+face count: if tied configs are really the same shape, volumes agree with the mesh.
const fs=require('fs'),zlib=require('zlib');
const R='/home/user/solidworks-converters/src/';
const P=require(R+'parasolid/partition.js'),D=require(R+'display.js'),native=require(R+'brep/native'),Pr=require(R+'brep/procedural'),V=require(R+'brep/volume');
const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b),C={inflateRaw:iR,inflate:iZ};
const f=process.argv[2];const raw=fs.readFileSync(f);const all=P.streams(raw);
const d=D.parseSLDPRT(raw,iR,iZ);
let vm=0;for(const fc of d.faces){const v=fc.vertices,t=fc.triangleIndices;for(let i=0;i<t.length;i+=3){const a=t[i]*3,b=t[i+1]*3,c=t[i+2]*3;
 vm+=(v[a]*(v[b+1]*v[c+2]-v[b+2]*v[c+1])-v[a+1]*(v[b]*v[c+2]-v[b+2]*v[c])+v[a+2]*(v[b]*v[c+1]-v[b+1]*v[c]))/6;}}
const out={f:f.split('/').pop(),meshVol:Math.abs(vm),rows:[]};
const names=Object.keys(all).filter(k=>/Config-\d+-Partition$/.test(k)).sort((a,b)=>+/Config-(\d+)/.exec(a)[1]-+/Config-(\d+)/.exec(b)[1]);
for(const n of names){const row={n:n.replace('Contents/','')};
 try{const a=P.assemble(all,n,C,{});const m=Pr.resolve(native.build(a.parsed));row.faces=m.faces.length;
  if(m.faces.length===d.faces.length){const v=V.volume(m);row.vol=Math.abs(v.volume);row.rel=(row.vol-out.meshVol)/out.meshVol;row.unsup=(v.unsupported||[]).length;}}
 catch(e){row.err=e.message.slice(0,80);}
 out.rows.push(row);}
console.log(JSON.stringify(out));
