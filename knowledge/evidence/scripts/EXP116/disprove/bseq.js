// Is the sequence of edge-derived face ids of a B file stored anywhere (any stream, any 4-aligned u32 positions)?
const fs=require('fs');const L=require('./lib');const modern=require('/home/user/solidworks-converters/src/container/modern');
const bj=JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/bjoin.json'));
function seqHits(buf,seq,maxGap,k){ // greedy: count positions where seq[0..k) appears in order with gaps<=maxGap
  const d=new DataView(buf.buffer,buf.byteOffset,buf.byteLength),n=buf.length;let c=0;
  for(let o=0;o+4<=n;o+=1){if(d.getUint32(o,true)!==seq[0])continue;
    let p=o,ok=true;for(let j=1;j<k;j++){let f=-1;for(let q=p+4;q<=Math.min(n-4,p+maxGap);q++)if(d.getUint32(q,true)===seq[j]){f=q;break;}if(f<0){ok=false;break;}p=f;}
    if(ok)c++;}
  return c;}
function run(label,file,seq,streams){
  const k=5;let total=0;const per={};
  for(const [name,buf] of Object.entries(streams)){const h=seqHits(buf,seq,400,k);if(h){per[name]=h;total+=h;}}
  console.log(label,'seq',seq.slice(0,8).join(','),'in-order 5-id windows (gap<=400B):',total,JSON.stringify(per));}
for(const f of [...new Set(bj.map(r=>r.file))]){
  const x=L.dlBytes(f);const streams=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);
  const seq=bj.filter(b=>b.file===f).sort((a,b)=>a.i-b.i).map(b=>b.nid);
  console.log(f.split('/').pop(),'streams',Object.keys(streams).length);
  run(' true order',f,seq.slice(0,40),streams);
  const rev=[...seq].reverse();run(' control reversed order',f,rev.slice(0,40),streams);
}
// positive control: layout A file, true ids from own block, gap<=2000 not 400 -> use face-span scan instead
{const f=L.ROOT+'/test files online/2024/346a04bc_R01_D_lower_1_140_washer_head.SLDPRT';
 const x=L.dlBytes(f),r=L.faces(x.dl),R=require('./rec'),m=L.mk(x.dl);
 const ids=r.faces.map(fc=>R.readFace(m,fc.geometryEnd).w.id);
 const streams=modern.decompressOpenSX(x.raw,L.S.inflateRaw,L.S.inflateZlib);
 const d=seqHits(x.dl,ids.slice(0,4),20000,Math.min(4,ids.length));
 console.log('positive control (A file, ids',ids.join(','),') windows in DL with gap<=20000, k=4:',d);}
