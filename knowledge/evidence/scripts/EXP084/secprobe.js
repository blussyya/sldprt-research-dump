const R=require('path').join(__dirname,'../../../../../solidworks-converters/src/');
const P=require(R+'parasolid/partition'),X=require(R+'parasolid/xt'),D=require(R+'display'),Z=require(R+'inflate');const fs=require('fs');
const f=process.argv[2],raw=fs.readFileSync(f);const all=P.streams(raw);
const g=Buffer.from(P.GUID);
console.log('display faces',D.parseSLDPRT(raw,Z.inflateRaw,Z.inflate).faces.length);
for(const [k,b] of Object.entries(all)){const B=Buffer.from(b);let i=B.indexOf(g);const rows=[];
  while(i>=4){const w=P.sections(b.subarray(0,i-4+4+B.readUInt32LE(i-4)),i-4);
    for(const x of w.out){const q=X.parse(x.body,true);const c={};for(const n of q.nodes)c[n.type]=(c[n.type]||0)+1;rows.push(`@${x.start} ${x.kind} body=${c[12]||0} face=${c[14]||0}${q.error?' ERR '+q.error.slice(0,40):''}`);}
    if(!w.out.length)rows.push(`@${i-4} bad: ${w.error}`);
    // continue the chain from here as well
    const ch=P.sections(b,i-4);if(ch.out.length>1)rows.push(`  chain from @${i-4}: ${ch.out.length} sections (${ch.error||'complete'})`);
    i=B.indexOf(g,i+1);}
  if(rows.length)console.log(k,b.length,'\n  '+rows.join('\n  '));}
