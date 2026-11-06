const fs=require('fs'),zlib=require('zlib');
const R='/home/user/solidworks-converters/src/';
const P=require(R+'parasolid/partition.js'),D=require(R+'display.js'),G=require(R+'geom/eval'),native=require(R+'brep/native'),Pr=require(R+'brep/procedural');
const raw=fs.readFileSync('/home/user/sldprt-research-dump/test files online/2014/300f9732_Carter2019.SLDPRT');
const iR=b=>zlib.inflateRawSync(b),iZ=b=>zlib.inflateSync(b);
const d=D.parseSLDPRT(raw,iR,iZ);
const top=d.faces.map((f,i)=>({i,z:f.bounds.max[2],tag:f.metadata&&f.metadata.typeTag})).sort((a,b)=>b.z-a.z).slice(0,4);
console.log('display faces by max z',top);
const all=P.streams(raw);const a=P.assemble(all,'Config-0-Partition',{inflateRaw:iR,inflate:iZ},{});
const n=native.build(a.parsed),m=Pr.resolve(n);
// per edge max z, with 257 samples vs 20001 samples, by curve type
const rows=[];
for(const e of m.edges.values()){if(!e.curve)continue;const c=e.curve.type==='trimmed'?e.curve.basis:e.curve;
  let t0=e.t0,t1=e.t1;if(t0===undefined||t1===undefined)continue;
  let mx=-1e9;for(let i=0;i<=20000;i++){mx=Math.max(mx,G.curvePoint(c,t0+(t1-t0)*i/20000)[2]);}
  let m2=-1e9;for(let i=0;i<=256;i++){m2=Math.max(m2,G.curvePoint(c,t0+(t1-t0)*i/256)[2]);}
  rows.push({type:c.type,id:e.id,fine:mx,coarse:m2});}
rows.sort((a,b)=>b.fine-a.fine);console.log(rows.slice(0,5));
console.log('edges with explicit t0/t1',rows.length,'of',[...m.edges.values()].length);
