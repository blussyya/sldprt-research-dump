#!/usr/bin/env node
'use strict';
/* EXP-064 saw a face-bounds-shaped record after a UTF-16 configuration name. This repeats the
 * arithmetic-only scan over the expanded corpus, then separates parser-owned face records from
 * surplus records. Equality to the union of the saved display faces is measured, not assumed. */
const fs=require('fs'),path=require('path');
const S=require('../../../../package');
const M=require('../../../../package/src/container/modern'),O=require('../../../../package/src/container/ole');
const {corpusFiles,relative}=require('./common');

const close=(a,b,t=1e-9)=>Math.abs(a-b)<=t;
const finite=n=>Number.isFinite(n)&&Math.abs(n)<=100;
function scan(dl){
  const hits=[];
  for(let o=0;o+132<=dl.length;o++){
    const C=[12,20,28].map(k=>dl.readDoubleLE(o+k)),A=[36,44,52].map(k=>dl.readDoubleLE(o+k)),B=[60,68,76].map(k=>dl.readDoubleLE(o+k)),R=dl.readDoubleLE(o+84);
    if(![...C,...A,...B,R].every(finite)||R<1e-9)continue;
    if(C.some((x,k)=>Math.abs(x-(A[k]+B[k])/2)>1e-12))continue;
    if(Math.abs(R-Math.hypot(A[0]-C[0],A[1]-C[1],A[2]-C[2]))>1e-12)continue;
    hits.push({o,C,A,B,R});
  }
  return hits;
}
function displayBytes(raw){return M.isOLE2(raw)?Buffer.from(O.displayLists(raw,S.inflateZlib).bytes):Buffer.from(M.findDisplayLists(raw,S.inflateRaw,S.inflateZlib));}
function union(faces){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const f of faces)if(f.bounds)for(let k=0;k<3;k++){min[k]=Math.min(min[k],f.bounds.min[k]);max[k]=Math.max(max[k],f.bounds.max[k]);}
  return {min,max};
}
function configurationName(b,o){
  // The bounds start eight bytes before the end of an MFC UTF-16 CString. This odd overlap is
  // consistent for short Chinese names and long translated "Default" names alike.
  for(let m=Math.max(0,o-512);m<=o;m++)if(b[m]===0xff&&b[m+1]===0xfe&&b[m+2]===0xff){
    let p=m+3,n=b[p++];
    if(n===0xff){n=b.readUInt16LE(p);p+=2;if(n===0xffff){n=b.readUInt32LE(p);p+=4;}}
    const end=p+2*n;if(end!==o+8||end>b.length)continue;
    const value=b.subarray(p,end).toString('utf16le');
    if(value&&![...value].some(c=>c<' '))return value;
  }
  return null;
}

const rows=[],errors=[];
for(const file of corpusFiles())try{
  const raw=fs.readFileSync(file),legacy=M.isOLE2(raw),dl=displayBytes(raw),parsed=S.parse(raw),hits=scan(dl),faceOffsets=new Set();
  // Modern records start at geometryEnd. Legacy layouts can insert two arrays first, so match the
  // decoded record bytes when there is no direct offset.
  if(!legacy)for(const f of parsed.faces)faceOffsets.add(f.geometryEnd);
  else for(const f of parsed.faces)if(f.bounds){const hex=Buffer.from(f.bounds.raw).subarray(0,132).toString('hex');for(const h of hits)if(dl.subarray(h.o,h.o+132).toString('hex')===hex)faceOffsets.add(h.o);}
  const extra=hits.filter(h=>!faceOffsets.has(h.o)),box=union(parsed.faces);
  const configs=hits.map(h=>({...h,name:configurationName(dl,h.o)})).filter(h=>h.name);
  const matches=configs.filter(h=>
    [0,1,2].every(k=>close(h.B[k],box.min[k])&&close(h.A[k],box.max[k]))).length;
  rows.push({file:relative(file),legacy,faces:parsed.faces.length,arithmeticRecords:hits.length,faceRecords:faceOffsets.size,
    surplus:extra.length,configurationRecords:configs.length,configurationMatchingDisplayUnion:matches,
    configurations:configs.map(h=>({offset:h.o,name:h.name,min:h.B,max:h.A}))});
}catch(e){errors.push({file:relative(file),error:e.message});}

const modern=rows.filter(r=>!r.legacy),legacy=rows.filter(r=>r.legacy),result={summary:{files:corpusFiles().length,read:rows.length,
  modernFiles:modern.length,modernWithConfigurationRecords:modern.filter(r=>r.configurationRecords).length,
  modernConfigurationRecords:modern.reduce((n,r)=>n+r.configurationRecords,0),
  modernConfigurationMatchingDisplayUnion:modern.reduce((n,r)=>n+r.configurationMatchingDisplayUnion,0),
  legacyFiles:legacy.length,legacyWithConfigurationRecords:legacy.filter(r=>r.configurationRecords).length,
  legacyConfigurationRecords:legacy.reduce((n,r)=>n+r.configurationRecords,0),errors:errors.length},rows,errors};
fs.writeFileSync(path.join(__dirname,'configuration-bounds.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
