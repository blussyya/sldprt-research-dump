'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..'),P=require('../parser/v0.1/src/parser-core'),V2=require('../parser/v0.2/src/parser-core');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function files(dir,suffix){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),suffix):e.name.toLowerCase().endsWith(suffix)?[path.join(dir,e.name)]:[]).sort();}
// Independently walk typed arrays; never call parser/v0.2 to select baseline faces.
function scan(b){
 const sig=Buffer.from('040000000800000002000000','hex'),out=[];
 function array(o,stride,kind){if(o+16>b.length)throw Error('header bounds');const h=[0,4,8,12].map(k=>b.readUInt32LE(o+k));if(h[0]!==stride||h[1]!==kind||h[2]!==2)throw Error('header');const end=o+16+stride*h[3];if(end>b.length)throw Error('payload bounds');return {o,end,n:h[3]};}
 for(let o=b.indexOf(sig);o>=0;o=b.indexOf(sig,o+1)){
  let pre,pos;try{pre=array(o,4,8);pos=array(pre.end,12,100);}catch{continue;}
  const norm=array(pos.end,12,100),b1=array(norm.end,4,8),b2=array(b1.end,4,8),b3=array(b2.end,1,8);
  out.push({o,pre,pos,norm,b1,b2,b3});
 }return out;
}
function box(b,o){return {center:[12,20,28].map(k=>b.readDoubleLE(o+k)),max:[36,44,52].map(k=>b.readDoubleLE(o+k)),min:[60,68,76].map(k=>b.readDoubleLE(o+k)),radius:b.readDoubleLE(o+84)};}
function checkBox(q){return {centerError:Math.max(...q.center.map((v,k)=>Math.abs(v-(q.min[k]+q.max[k])/2))),radiusError:Math.abs(q.radius-Math.hypot(...q.max.map((v,k)=>v-q.center[k]))),ordered:q.min.every((v,k)=>v<=q.max[k])};}
const modern=[],skipped=[],b2Failures=[],boundFailures=[];let faces=0,strips=0,mutantControl=null;
for(const base of ['test files original','test files new/SW2022'])for(const file of files(path.join(ROOT,base),'.sldprt')){
 const input=fs.readFileSync(file),rel=path.relative(ROOT,file);if(P.isOLE2(input)){skipped.push(rel);continue;}
 const b=Buffer.from(P.findDisplayLists(input,zlib.inflateRawSync,zlib.inflateSync)),candidates=scan(b),rows=[];
 for(const f of candidates){
  faces++;let mismatches=0;const L=Array.from({length:f.pre.n},(_,i)=>b.readUInt32LE(f.pre.o+16+i*4));
  if(f.b2.n!==L.length)mismatches++;
  for(let i=0;i<f.b2.n;i++){strips++;if(b.readUInt32LE(f.b2.o+16+i*4)!==2*L[i]-2)mismatches++;}
  if(mismatches)b2Failures.push({file:rel,offset:f.o,mismatches});
  const q=box(b,f.b3.end),ck=checkBox(q),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<f.pos.n;i++)for(let k=0;k<3;k++){const v=b.readFloatLE(f.pos.o+16+i*12+k*4);lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);}
  const containmentGap=Math.max(...lo.map((v,k)=>q.min[k]-v),...hi.map((v,k)=>v-q.max[k]));
  const equal=lo.every((v,k)=>Math.abs(v-q.min[k])<1e-12&&Math.abs(hi[k]-q.max[k])<1e-12);
  const float32Contains=lo.every((v,k)=>Math.fround(q.min[k])<=v&&Math.fround(q.max[k])>=hi[k]);
  const row={offset:f.o,geometryEnd:f.b3.end,...q,...ck,meshMin:lo,meshMax:hi,containmentGap,equal,float32Contains};rows.push(row);
  if(ck.centerError>=1e-12||ck.radiusError>=1e-12||!ck.ordered)boundFailures.push({file:rel,...row});
  if(!mutantControl){
   const bad=Buffer.from(b),at=f.b2.o+16;bad.writeUInt32LE(b.readUInt32LE(at)+1,at);
   const selected=scan(bad),parsed=V2.extractDisplayLists(bad);
   assert(selected.some(x=>x.o===f.o));assert(!parsed.faces.some(x=>x.offset===f.o));
   mutantControl={file:rel,offset:f.o,rawScannerRetainsMutation:true,parserDropsMutation:true,rejections:parsed.rejected};
  }
 }
 modern.push({file:rel,sha256:hash(input),displaySHA256:hash(b),faces:rows});
}
// A deliberately padded mesh box satisfies the same identities and containment.
const original=modern[0].faces[0],padding=1e-4;
const padded={min:original.meshMin.map(v=>v-padding),max:original.meshMax.map(v=>v+padding)};
padded.center=padded.min.map((v,k)=>(v+padded.max[k])/2);padded.radius=Math.hypot(...padded.max.map((v,k)=>v-padded.center[k]));
assert(checkBox(padded).centerError<1e-12&&checkBox(padded).radiusError<1e-12);
const swapped={...original,min:original.max,max:original.min};
// XT boundary located without EXP-058: known final declaration followed immediately by Z.
const xtRows=[],prefixes={};
const buildLog=fs.readFileSync(path.join(ROOT,'test files new/SW2022/BUILD_LOG.md'),'utf8'),native={};
for(const section of buildLog.split(/^## /m).slice(1)){
 const heading=section.split('\n')[0].trim(),count=/Total face count:\s*`(\d+)`/.exec(section);
 if(count)native[heading.toLowerCase()]=Number(count[1]);
}
for(const version of ['SW2022','SW2011'])for(const file of files(path.join(ROOT,'test files new',version),'.x_b')){
 const raw=fs.readFileSync(file),text=fs.readFileSync(file.replace(/x_b$/,'x_t'),'latin1'),step=fs.readFileSync(file.replace(/x_b$/,'step'),'latin1');
 const e=raw.indexOf('**END_OF_HEADER'),b=raw.subarray(raw.indexOf('\n',e)+1);
 const marker=version==='SW2022'?Buffer.from('mesh_offset_data'):Buffer.from('attdef_list');
 // SW2011 last name is recorded below if this assumption does not fit; fail explicitly.
 let z;
 if(version==='SW2022'){const at=b.indexOf(marker);assert(at>=0);z=at+marker.length+4;assert.equal(b[z],90);}
 else {const match=b.indexOf(Buffer.from([90,0,2]));assert(match>=0);z=match;}
 const joined=text.slice(text.indexOf('**END_OF_HEADER')).replace(/\r?\n/g,'');
 const m=/Z1 (\d+) 2 3 /.exec(joined);assert(m,'missing first record text');
 const bin=b.readUInt32BE(z+3),txt=Number(m[1]),faceCount=(step.match(/\bADVANCED_FACE\s*\(/g)||[]).length;
 (prefixes[version]??=new Set()).add(hash(b.subarray(0,z)));
 const nativeFaces=native[(version+'/'+path.basename(path.dirname(file))).toLowerCase()];assert(Number.isInteger(nativeFaces));
 xtRows.push({file:path.relative(ROOT,file),sha256:hash(raw),textSHA256:hash(Buffer.from(text,'latin1')),stepSHA256:hash(Buffer.from(step,'latin1')),boundary:z,binary:bin,text:txt,delta:bin-txt,nativeFaces,nativeFaceDeltaMatches:bin-txt===nativeFaces,stepFaces:faceCount,stepFaceDeltaMatches:bin-txt===faceCount,following40Hex:b.subarray(z,z+40).toString('hex'),sizeDouble:b.readDoubleBE(z+25),resolutionDouble:b.readDoubleBE(z+33)});
}
// Reproduce original scripts with only their hardcoded checkout root relocated in memory.
const reproduce=[];
for(const name of ['EXP059/review.js','EXP060/field-vs-text.js','EXP060/prefix-geometry.js','EXP060/legacy-partition.js','EXP061/bbox-layout.js','EXP061/block2-redundancy.js']){
 const filename=path.join(ROOT,'knowledge/evidence/scripts',name),src=fs.readFileSync(filename,'utf8'),lines=[];
 try{vm.runInNewContext(src.replaceAll('/home/user/sldprt-research-dump',ROOT),{require:require('module').createRequire(filename),__dirname:path.dirname(filename),__filename:filename,Buffer,console:{log:(...a)=>lines.push(a.join(' '))},process:{exit:c=>{throw Error('exit '+c);}}},{filename});reproduce.push({script:name,sha256:hash(Buffer.from(src)),stdout:lines.join('\n')});}
 catch(e){reproduce.push({script:name,sha256:hash(Buffer.from(src)),stdout:lines.join('\n'),error:e.message});}
}
const result={date:'2026-09-21',experiment:'EXP-062',baseCommit:'511282ed3f866d78d4a3c3396a37ef57c60c1ab6',scriptSHA256:hash(fs.readFileSync(__filename)),independence:'Fresh array walker, fresh bound arithmetic and XT field probes; shared v0.1 container decompressor. Original scripts rerun separately, not counted as independent.',summary:{modernFiles:modern.length,faces,strips,b2Failures:b2Failures.length,boundIdentityFailures:boundFailures.length,uniquePrefixes:Object.fromEntries(Object.entries(prefixes).map(([k,v])=>[k,v.size]))},skipped,b2Failures,boundFailures,modern,xtRows,mutantControl,syntheticControls:{padding,padded,paddedChecks:checkBox(padded),swappedChecks:checkBox(swapped)},reproduce};
result.buildLogSHA256=hash(Buffer.from(buildLog));
const serialized=JSON.stringify(result,null,2)+'\n';
fs.writeFileSync(path.join(__dirname,'EXP062_RESULTS.json'),serialized);
fs.writeFileSync(path.join(__dirname,'EXP062_RESULTS.json.gz'),zlib.gzipSync(serialized));
console.log(JSON.stringify(result.summary));console.log('XT native face delta matches',xtRows.filter(x=>x.nativeFaceDeltaMatches).length,'/',xtRows.length);console.log('Reproduction errors',reproduce.filter(x=>x.error).map(x=>({script:x.script,error:x.error})));
