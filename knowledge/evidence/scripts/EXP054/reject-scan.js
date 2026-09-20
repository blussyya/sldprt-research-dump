// Two external claims, tested against our corpus:
//   sldprt-export: a face record may legitimately carry ZERO normals entries.
//                  Our parser requires normals.count === positions.count, so
//                  such a record would be rejected. Does it ever occur here?
//   cadmpeg AL-03: an "extended" tessellation-table header with a nonzero token
//                  in the slot we always observe as a fixed value.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT='/home/user/sldprt-research-dump/test files original';
const v1=require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');
const v2=require('/home/user/sldprt-research-dump/parser/v0.2/src/parser-core.js');
const iR=b=>zlib.inflateRawSync(Buffer.from(b)),iZ=b=>zlib.inflateSync(Buffer.from(b));
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(ROOT);files.sort();
const reasons=new Map(); let totFaces=0,totRej=0,filesOk=0;
for(const f of files){
 const buf=fs.readFileSync(f); if(v1.isOLE2(buf))continue;
 const res=v2.parseSLDPRT(buf,iR,iZ);
 if(res.errors&&res.errors.length){console.log(`ERR ${path.relative(ROOT,f)}: ${res.errors.join('; ')}`);continue;}
 filesOk++; totFaces+=res.faces.length; totRej+=(res.rejected||[]).length;
 for(const r of res.rejected||[]){const k=(r.reason||r.error||JSON.stringify(r)).replace(/ at \d+/,' at N');
  reasons.set(k,(reasons.get(k)||0)+1);}
}
console.log(`\nfiles parsed ${filesOk}   faces accepted ${totFaces}   records rejected ${totRej}`);
console.log('\n=== rejection reasons ===');
for(const [k,c] of [...reasons].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(c).padStart(5)}  ${k}`);
const zero=[...reasons].filter(([k])=>/count mismatch|Array count/i.test(k));
console.log(`\nzero-normals-shaped rejections: ${zero.length?zero.map(z=>z[1]).reduce((a,b)=>a+b):0}`);
