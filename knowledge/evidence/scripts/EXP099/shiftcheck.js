#!/usr/bin/env node
'use strict';
/* EXP-099 step 9: controls for the record-boundary check.
 * The check re-reads the surface-tag block of a face record, with the read offset moved by `shift` bytes
 * from where the converter reads it, and passes the record when ALL of:
 *   (1) tag in 4001..4010, (2) reserved triple all zero, (3) the 8-byte edge records fit before the next record,
 *   (4) the set of edge-record ids equals the set of non-zero Block1 labels (or both empty).
 * Control A: shift 0 on every record the reader accepted with a tag in range (must pass ~all).
 * Control B: shifts of +-1,2,4,8,12,16 bytes on the same records (must fail ~all).
 * Control C: the 56 odd records at shift 0 (must fail all), and a coincidence floor: how many records pass
 *   at ANY shift in -64..64 other than 0 on a random-byte stand-in (records of the bad parts).
 * Also: shifted record START (geometryEnd+k) -> the array header check should reject. Writes shiftcheck.json. */
const S=require('/home/user/conv-dev/src'),fs=require('fs'),path=require('path');
const ROOT='/home/user/sldprt-research-dump/';
const sw=JSON.parse(fs.readFileSync(path.join(__dirname,'sweep.json')));
const u=(b,o)=>b.readUInt32LE(o);
function arr(b,o,stride){if(o<0||o+16>b.length)return null;if(u(b,o)!==stride||u(b,o+4)!==100||u(b,o+8)!==2)return null;const e=o+16+stride*u(b,o+12);return e<=b.length?{end:e}:null;}
function tailStart(b,start){ // offset of the reserved triple, mirroring src/display.js metadata()
  const a8=arr(b,start+132,8);if(!a8)return null;const pos=arr(b,a8.end+4,12);if(!pos)return null;const nor=arr(b,pos.end,12);if(!nor)return null;
  let o=nor.end;if(o+4>b.length)return null;const sf=u(b,o);o+=4;
  if(sf===1){for(let i=0;i<2;i++){const a=arr(b,o,4);if(!a)return null;o=a.end;}}else if(sf!==0)return null;
  return o;}
function check(b,o,limit,labels){ // o = start of reserved triple
  if(o<0||o+12+28+4+64+4>b.length)return {pass:false,why:'out of bounds'};
  const rv=[u(b,o),u(b,o+4),u(b,o+8)];const t=o+12+28;const tag=u(b,t),cnt=u(b,t+68);
  if(tag<4001||tag>4010)return {pass:false,why:'tag '+tag};
  if(rv.some(x=>x!==0))return {pass:false,why:'reserved'};
  const end=t+72+cnt*8;if(cnt>100000||end>limit)return {pass:false,why:'edge table overruns'};
  const ids=[...new Set(Array.from({length:cnt},(_,i)=>u(b,t+72+i*8)))].sort((a,c)=>a-c);
  if(ids.length&&JSON.stringify(ids)!==JSON.stringify(labels))return {pass:false,why:'labels'};
  return {pass:true};
}
const shifts=[0,-16,-12,-8,-4,-2,-1,1,2,4,8,12,16];
const res={control_A_B:{records:0,byShift:Object.fromEntries(shifts.map(s=>[s,{pass:0,why:{}}]))},oddRecords:{records:0,pass:0,why:{}},startShift:{records:0,byShift:{}}};
const startShifts=[-8,-4,-1,1,4,8];startShifts.forEach(s=>res.startShift.byShift[s]={readerAcceptsOrChecksPass:0});
const odd=new Set(sw.parts.filter(p=>p.odd&&p.odd.length).map(p=>p.file));
for(const part of sw.parts){
  if(part.error||part.format!=='modern DisplayLists'||!part.withMetadata)continue;
  const f=ROOT+part.file,buf=fs.readFileSync(f),d=S.parse(buf);
  const b=Buffer.from(S.container.modern.findDisplayLists(new Uint8Array(buf),S.inflateRaw,S.inflateZlib));
  d.faces.forEach((F,i)=>{
    if(!F.metadata)return;
    const limit=d.faces[i+1]?d.faces[i+1].offset:b.length;
    const labels=[...new Set(F.edgeAnnotations.map(e=>e.id).filter(x=>x!==0))].sort((a,c)=>a-c);
    const o0=tailStart(b,F.geometryEnd);
    const isOdd=F.metadata.typeTag<4001||F.metadata.typeTag>4010;
    if(isOdd){res.oddRecords.records++;const r=check(b,o0,limit,labels);if(r.pass)res.oddRecords.pass++;else res.oddRecords.why[r.why.split(' ')[0]]=(res.oddRecords.why[r.why.split(' ')[0]]||0)+1;return;}
    res.control_A_B.records++;
    for(const s of shifts){const r=check(b,o0+s,limit,labels);const c=res.control_A_B.byShift[s];if(r.pass)c.pass++;else c.why[r.why.split(' ')[0]]=(c.why[r.why.split(' ')[0]]||0)+1;}
    res.startShift.records++;
    for(const s of startShifts){const o=tailStart(b,F.geometryEnd+s);if(o!==null&&check(b,o,limit,labels).pass)res.startShift.byShift[s].readerAcceptsOrChecksPass++;}
  });
}
fs.writeFileSync(path.join(__dirname,'shiftcheck.json'),JSON.stringify(res,null,1)+'\n');
console.log(JSON.stringify(res,null,1));
