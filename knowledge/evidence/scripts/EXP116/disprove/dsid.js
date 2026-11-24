const fs=require('fs');const L=require('./lib');const modern=require('/home/user/solidworks-converters/src/container/modern');
const bj=JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/bjoin.json'));
const f=bj.find(b=>/1e794aad/.test(b.file)).file;
const x=L.dlBytes(f);const st=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);
const b=st['Contents/Config-0-DownstreamIdData'];const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
console.log('len',b.length);
let s='';for(let i=0;i<Math.min(b.length,160);i+=4)s+=d.getUint32(i,true)+' ';console.log(s);
const seq=bj.filter(q=>q.file===f).sort((a,b)=>a.i-b.i).map(q=>q.nid);
console.log('display-order face ids',seq.slice(0,30).join(','),'... n',seq.length);
const all=new Set();for(let i=0;i+4<=b.length;i+=4)all.add(d.getUint32(i,true));
console.log('distinct u32 in stream',all.size,'display ids found in stream (4-aligned):',seq.filter(v=>all.has(v)).length,'of',seq.length);
// control: native edge ids? random ints 1..1500
let seed=3;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;let c=0;for(let i=0;i<seq.length;i++)if(all.has(1+Math.floor(rnd()*1500)))c++;console.log('control random ids 1..1500 found',c);
