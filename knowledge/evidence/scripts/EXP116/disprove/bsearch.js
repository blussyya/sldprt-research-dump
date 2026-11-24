const fs=require('fs');const L=require('./lib');const modern=require('/home/user/solidworks-converters/src/container/modern');
const bj=JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/bjoin.json'));
const files=[...new Set(bj.map(r=>r.file))];
let seed=7;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
for(const f of files){
  const x=L.dlBytes(f),r=L.faces(x.dl),m=L.mk(x.dl);
  const rows=bj.filter(b=>b.file===f);
  console.log(f.split('/').pop(),'faces with edge-derived id',rows.length,'of',r.faces.length);
  // (1) per relative offset hit in face span
  const hits=new Map(),ctl=new Map();
  const allIds=rows.map(b=>b.nid);
  for(const b of rows){const fc=r.faces[b.i],nxt=r.faces[b.i+1]?r.faces[b.i+1].offset:x.dl.length;
    const fake=allIds[Math.floor(rnd()*allIds.length)];
    for(let o=fc.offset;o+4<=nxt;o+=1){const rel=o-b.G;const v=m.u(o);
      if(v===b.nid)hits.set(rel,(hits.get(rel)||0)+1);if(v===fake)ctl.set(rel,(ctl.get(rel)||0)+1);}}
  const top=[...hits.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4),topc=[...ctl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2);
  console.log('  best rel offsets (of',rows.length,'):',JSON.stringify(top),'control(random other id):',JSON.stringify(topc));
  // (2) tags 4001..4010 across all streams
  let streams;try{streams=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);}catch(e){streams={};}
  const tot={};
  for(const [name,buf] of Object.entries(streams)){let c=0;const d=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
    for(let o=0;o+4<=buf.length;o+=4){const v=d.getUint32(o,true);if(v>=4001&&v<=4010)c++;}
    if(c)tot[name]=c;}
  console.log('  u32 in 4001..4010 (4-aligned) per stream:',JSON.stringify(tot));
}
