// Raw scan of the (deltas) section: header text, then every big-endian double triple that is a unit
// vector parallel to STEP face 173's normal, with the triple before it read as a point (PLANE layout).
const P=require('/home/user/conv-inspector/src/parasolid/partition.js'),fs=require('fs');
const N=[0,-0.0872,-0.9962],O=[-25.2,51.296,-70.238];
const all=P.streams(fs.readFileSync(process.argv[2]));
for(const [k,b] of Object.entries(all)){if(!/Partition$/.test(k))continue;
  const g=Buffer.from(b).indexOf(Buffer.from(P.GUID));const w=P.sections(b,g-4);const d=Buffer.from(w.out.find(s=>s.kind==='deltas').body);
  console.log(k,'deltas',d.length,'B; head:',JSON.stringify(d.subarray(0,90).toString('latin1')));
  const seen=new Set();
  for(let i=24;i+24<=d.length;i++){const v=[d.readDoubleBE(i),d.readDoubleBE(i+8),d.readDoubleBE(i+16)];
    if(!v.every(Number.isFinite)||Math.abs(Math.hypot(...v)-1)>1e-9)continue;const dot=v[0]*N[0]+v[1]*N[1]+v[2]*N[2];if(Math.abs(Math.abs(dot)-1)>1e-3)continue;
    const p=[d.readDoubleBE(i-24),d.readDoubleBE(i-16),d.readDoubleBE(i-8)];if(!p.every(x=>Number.isFinite(x)&&Math.abs(x)<1))continue;
    const off=(p[0]*1000-O[0])*N[0]+(p[1]*1000-O[1])*N[1]+(p[2]*1000-O[2])*N[2];const key=off.toFixed(4);if(Math.abs(off)>2||seen.has(key))continue;seen.add(key);
    console.log('  at',i-24,'offset from STEP 173:',key,'mm  point(mm)',p.map(x=>(x*1000).toFixed(3)).join(' '));}
}
