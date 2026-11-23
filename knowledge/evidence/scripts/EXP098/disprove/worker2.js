// worker2.js <file>: for a single-partition file (answer unambiguous), the display-vs-B-rep face count and box gap of the only config.
// Control for the box test: how often does the TRUE configuration pass gap<=1e-8?
const fs=require('fs'),zlib=require('zlib');
const R='/home/user/solidworks-converters/src/';
const P=require(R+'parasolid/partition.js'),S=require(R+'parasolid/select.js'),D=require(R+'display.js');
const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b),C={inflateRaw:iR,inflate:iZ};
const f=process.argv[2];const raw=fs.readFileSync(f);const all=P.streams(raw);
const n=Object.keys(all).find(k=>/Config-\d+-Partition$/.test(k));
const d=D.parseSLDPRT(raw,iR,iZ),want=S.displayBox(d);const out={f,df:d.faces.length,want:!!want};
try{const a=P.assemble(all,n,C,{});if(a.parsed.error)throw Error(a.parsed.error);const r=S.brepBox(a.parsed);out.faces=r.faces;
 if(want){const g=[];for(let k=0;k<3;k++)g.push(Math.abs(r.box.min[k]-want.min[k]),Math.abs(r.box.max[k]-want.max[k]));out.gap=Math.max(...g);
  out.worst=g.indexOf(Math.max(...g));}}catch(e){out.error=e.message.slice(0,120);}
console.log(JSON.stringify(out));
