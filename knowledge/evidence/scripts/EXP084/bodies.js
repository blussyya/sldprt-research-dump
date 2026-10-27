const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),X=require(R+'parasolid/xt'),D=require(R+'display'),Z=require(R+'inflate');const fs=require('fs');
const f=process.argv[2],raw=fs.readFileSync(f),all=P.streams(raw),G=Buffer.from(P.GUID);
const d=D.parseSLDPRT(raw,Z.inflateRaw,Z.inflate);
// display per-body? metadata rawId groups
console.log('display faces',d.faces.length);
function per(q){const by=new Map(q.nodes.map(n=>[n.index,n]));const out=new Map();
  for(const n of q.nodes.filter(n=>n.type===14)){const sh=by.get(n.values.shell)||by.get(n.values.front_shell);const b=sh&&sh.values.body;out.set(b,(out.get(b)||0)+1);}
  return [...q.nodes.filter(n=>n.type===12)].map(b=>`${b.index}:${'?STGWM'[0]}t${b.values.body_type}:${out.get(b.index)||0}f`).join(' ');}
for(const [k,b] of Object.entries(all)){const B=Buffer.from(b);let i=B.indexOf(G);const rows=[];
  while(i>=4){const w=P.sections(b.subarray(0,i-4+4+B.readUInt32LE(i-4)),i-4);for(const x of w.out){if(x.kind==='deltas')continue;const q=X.parse(x.body,true);rows.push(`@${x.start} ${x.kind}: ${per(q)}`);}i=B.indexOf(G,i+1);}
  if(rows.length)console.log(k,'\n  '+rows.join('\n  '));}
