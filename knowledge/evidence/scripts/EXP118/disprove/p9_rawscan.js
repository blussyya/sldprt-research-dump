// Is there mesh data in the DisplayLists stream that the reader didn't put in a face, lying in the
// hole? Scan every byte offset of the decompressed stream for float32 triplets on the bore cylinder
// (|r - R| <= 2e-6 m, unit normals excluded by requiring |p| > 1e-3), bucket them by whether the offset
// is inside a parsed face's position array, and report those in the gap region.
// Control: the scan must find every vertex of display face 75 that is on the surface.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs'),zlib=require('zlib');
const ole=require(L.R+'/src/container/ole'),display=require(L.R+'/src/display');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const nfid=+process.argv[2]||2516,di=+process.argv[3]||75;
const buf=fs.readFileSync(file),M=N.build(S.readBrep(buf).parsed);
const ex=ole.displayLists(buf,b=>zlib.inflateSync(b));const dl=Buffer.from(ex.bytes);
const r=display.extractDisplayLists(dl,true);console.log('stream',ex.stream,'bytes',dl.length,'faces',r.faces.length);
const cyl=M.faces.find(f=>f.id===nfid).surface,y=G.cross(cyl.a,cyl.x);
const cc=p=>{const q=G.sub(p,cyl.p);return {th:Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI,h:G.dot(q,cyl.a)*1000,dr:(Math.hypot(G.dot(q,cyl.x),G.dot(q,y))-cyl.r)};};
// ownership intervals: positions arrays of parsed faces
const own=[];r.faces.forEach((f,i)=>{const o=f.offsets.positions;own.push([o+16,o+16+12*f.vertexCount,i]);});
own.sort((a,b)=>a[0]-b[0]);
const owner=o=>{let lo=0,hi=own.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(o<own[m][0])hi=m-1;else if(o>=own[m][1])lo=m+1;else return own[m][2];}return -1;};
const hits={owned:{},unowned:[]};
for(let o=0;o+12<=dl.length;o++){const p=[dl.readFloatLE(o),dl.readFloatLE(o+4),dl.readFloatLE(o+8)];if(!p.every(Number.isFinite)||Math.hypot(...p)<1e-3||Math.hypot(...p)>1)continue;
  const c=cc(p);if(Math.abs(c.dr)>2e-6||c.h<-12||c.h>0)continue;
  const w=owner(o);if(w>=0&&(o-own.find(x=>x[2]===w)[0])%12===0){hits.owned[w]=(hits.owned[w]||0)+1;}else hits.unowned.push({o,th:c.th.toFixed(1),h:c.h.toFixed(3)});}
console.log('on-cylinder triplets owned by parsed faces (face:count):',JSON.stringify(hits.owned));
const f=r.faces[di];let on=0;for(let i=0;i<f.vertexCount;i++){const c=cc([f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);if(Math.abs(c.dr)<=2e-6&&c.h>=-12&&c.h<=0)on++;}
console.log('control: face',di,'vertices on cylinder',on,'found by scan',hits.owned[di]||0);
console.log('unowned on-cylinder triplets',hits.unowned.length,JSON.stringify(hits.unowned.slice(0,30)));
