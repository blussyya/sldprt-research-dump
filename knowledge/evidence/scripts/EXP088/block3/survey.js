'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dump=path.resolve(__dirname,'../../../../..'),S=require(path.join(dump,'../solidworks-converters/src'));
const files=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())walk(q);else if(/\.sldprt$/i.test(e.name))files.push(q);}}
for(const d of ['test files original','test files new','test files online'])walk(path.join(dump,d));
const out=[];
for(const file of files.sort()){
 const b=fs.readFileSync(file),row={file:path.relative(dump,file),sha256:crypto.createHash('sha256').update(b).digest('hex')};
 try{
  const legacy=S.container.modern.isOLE2(b),rawDisplay=legacy?S.container.ole.displayLists(b,S.inflateZlib).bytes:S.container.modern.findDisplayLists(b,S.inflateRaw,S.inflateZlib);
  if(!rawDisplay)throw Error('No display-list bytes returned');
  const dl=Buffer.from(rawDisplay);
  const parsed=S.display.extractDisplayLists(dl,legacy);
  row.faces=parsed.faces.length;row.rejected=parsed.rejected;row.bareFaces=0;row.bytes=0;row.nonzero=0;row.rawMismatch=0;row.nonzeroFaces=[];
  for(const [i,f] of parsed.faces.entries()){
   if(f.noEdgeTable){row.bareFaces++;continue;}
   const at=f.offsets.block3,header=[0,4,8,12].map(k=>dl.readUInt32LE(at+k)),raw=dl.subarray(at+16,at+16+header[3]);
   if(header[0]!==1||header[1]!==8||header[2]!==2||header[3]!==f.block1.length||!raw.equals(Buffer.from(f.block3)))row.rawMismatch++;
   row.bytes+=raw.length;const nz=[];for(let k=0;k<raw.length;k++)if(raw[k])nz.push([k,raw[k],f.block1[k]]);
   row.nonzero+=nz.length;if(nz.length)row.nonzeroFaces.push({face:i,offset:at,header,nonzero:nz});
  }
  // Search raw array headers too: these are candidates, not necessarily face Block3 arrays.
  const sig=Buffer.from([1,0,0,0,8,0,0,0,2,0,0,0]);row.rawCandidates=[];
  for(let at=dl.indexOf(sig);at>=0;at=dl.indexOf(sig,at+1))if(at+16<=dl.length){const n=dl.readUInt32LE(at+12);if(at+16+n<=dl.length){let nz=0;for(let k=0;k<n;k++)if(dl[at+16+k])nz++;row.rawCandidates.push({offset:at,length:n,nonzero:nz,acceptedFace:parsed.faces.some(f=>!f.noEdgeTable&&f.offsets.block3===at)});}}
 }catch(e){row.error=e.message;}
 out.push(row);
}
fs.writeFileSync(path.join(__dirname,'survey.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({files:out.length,uniqueFiles:new Set(out.map(r=>r.sha256)).size,faces:out.reduce((s,r)=>s+(r.faces||0),0),bytes:out.reduce((s,r)=>s+(r.bytes||0),0),nonzero:out.reduce((s,r)=>s+(r.nonzero||0),0),errors:out.filter(r=>r.error).map(r=>({file:r.file,error:r.error})),nonzeroFiles:out.filter(r=>r.nonzero).map(r=>r.file),unclaimedNonzero:out.flatMap(r=>(r.rawCandidates||[]).filter(c=>!c.acceptedFace&&c.nonzero).map(c=>({file:r.file,...c})))},null,2));
