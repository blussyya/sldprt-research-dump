// head_back: how far are the display's boundary corner points (ends of each labelled edge run) from
// the nearest native vertex? Many far ones mean the display and the B-rep describe different geometry.
// Control: the same for f666f342 and 92c393f4.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
for(const file of process.argv.slice(2)){const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);const vs=[...M.vertices.values()].map(v=>v.p);
  const ends=new Set();d.faces.forEach(f=>{const {E}=L.meshEdges(f);const deg=new Map();for(const [p,e] of E){if(e.uses!==1)continue;const id=e.ids.find(x=>x);if(!id)continue;for(const k of p.split('|')){const kk=k+'#'+id;deg.set(kk,(deg.get(kk)||0)+1);}}
    for(const [kk,n] of deg)if(n===1)ends.add(kk.split('#')[0]);});
  const ds=[...ends].map(k=>{const p=L.P(k);let m=Infinity;for(const v of vs){const x=G.dist(v,p);if(x<m)m=x;}return m;}).sort((a,b)=>a-b);
  console.log(file.split('/').pop(),'display faces',d.faces.length,'native faces',M.faces.length,'corner points',ds.length,'>1e-5 m',ds.filter(x=>x>1e-5).length,'>1e-4 m',ds.filter(x=>x>1e-4).length,'>1e-3 m',ds.filter(x=>x>1e-3).length,'max',ds[ds.length-1].toExponential(2));}
