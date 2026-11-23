// Claim 1. Own raw reader (lib.js). Bars stated in report.
const fs=require('fs'),path=require('path'),L=require('./lib'),S=require('/home/user/solidworks-converters/src/container/modern');
const root='/home/user/sldprt-research-dump';const files=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files online');
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root+'/test files new/SW2022');
const valid=t=>t>=4001&&t<=4010;
// hidden-block search: id u32, 3 f64 forming a unit vector, then u32 tag 4001-4010, anywhere in [from,to)
function hiddenBlock(b,from,to){for(let q=from;q+32<=to;q++){const v=[0,1,2].map(k=>b.readDoubleLE(q+4+8*k));if(!v.every(Number.isFinite))continue;if(Math.abs(Math.hypot(...v)-1)<1e-6&&valid(b.readUInt32LE(q+28)))return q;}return -1;}
const C={recs:0,zero:0,zero_valid:0,zero_invalid:0,nz:0,nz_valid:0,nz_invalid:0,err:0};
const shift={};for(const s of [1,2,4,8,12,28,32])shift[s]={tested:0,valid:0};
const perPart={},partsWithNZ=[];const nzSf={};
const named={'0739c559':0,'7765d286':0,'eefa906d':0};
for(const f of files){const raw=fs.readFileSync(f);if(S.isOLE2(raw))continue;let b;try{b=L.dlBytes(f);}catch(e){continue;}if(!b)continue;
  const sc=L.scan(b);const pp={n:0,zero:0,nz:0,nzTag:{},hidden:0,sfNZ:{}};
  sc.forEach((x,i)=>{const m=L.meta(b,x);if(m.err){C.err++;return;}C.recs++;pp.n++;const z=m.res.every(v=>v===0);
    if(z){C.zero++;pp.zero++;valid(m.tag)?C.zero_valid++:C.zero_invalid++;
      for(const s in shift){const m2=L.meta(b,x,+s);if(m2.err)continue;shift[s].tested++;if(valid(m2.tag))shift[s].valid++;}}
    else{C.nz++;pp.nz++;valid(m.tag)?C.nz_valid++:C.nz_invalid++;pp.nzTag[m.tag]=(pp.nzTag[m.tag]||0)+1;pp.sfNZ[m.sf]=(pp.sfNZ[m.sf]||0)+1;
      const end=i+1<sc.length?sc[i+1].off:b.length;if(hiddenBlock(b,m.resOff+12,end)>=0)pp.hidden++;}});
  perPart[path.basename(f)]=pp;if(pp.nz)partsWithNZ.push(path.basename(f));}
const out={contingency_modern_records:C,shiftControl_goodRecords_tagValidRate:Object.fromEntries(Object.entries(shift).map(([s,v])=>[s,{...v,rate:+(v.valid/v.tested).toFixed(4)}])),
 partsWithAnyNonzeroReserved:partsWithNZ.length,partsWithNZ:partsWithNZ.map(n=>[n,perPart[n].nz,perPart[n].n,perPart[n].hidden]),
 named:Object.fromEntries(Object.entries(perPart).filter(([k])=>/^(0739c559|7765d286|eefa906d)/.test(k)).map(([k,v])=>[k,v]))};
fs.writeFileSync('claim1.json',JSON.stringify(out,null,1));
console.log(JSON.stringify({C,shift:out.shiftControl_goodRecords_tagValidRate,nParts:partsWithNZ.length,nzRecordsInNamed3:Object.values(out.named).reduce((s,v)=>s+v.nz,0)},null,1));
for(const r of out.partsWithNZ)console.log(r.join(' | '));
for(const [k,v] of Object.entries(out.named))console.log(k.slice(0,8),'records',v.n,'zero',v.zero,'nz',v.nz,'hiddenValidBlockFoundInTail',v.hidden,'sf',JSON.stringify(v.sfNZ));
