// Legacy display faces: the u32 at offset 82 of the undecoded tail after the bounding record
// (face 75 has 2516 there). Compare with the native face found WITHOUT ids: the one face whose loops
// hold every native edge the display face's edges were matched to (map from p13_idmatch.js, MAPOUT).
// Control: in the 2013/2014 files without edge shifts the diff should be 0 everywhere.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),fs=require('fs');
const file=process.argv[2],map=JSON.parse(fs.readFileSync(process.argv[3]));
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const facesOf=new Map();for(const f of M.faces)for(const l of f.loops)for(const c of l.coedges){if(!facesOf.has(c.edge))facesOf.set(c.edge,new Set());facesOf.get(c.edge).add(f.id);}
const hist={},rows=[];let none=0,multi=0,short=0;
d.faces.forEach((f,fi)=>{const t=Buffer.from(f.legacyTail||[]);if(t.length<86){short++;return;}const tid=t.readUInt32LE(82);
  const ne=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].map(x=>map[x]).filter(x=>x!==undefined);
  let c=null;for(const e of ne){const s=facesOf.get(e)||new Set();c=c?new Set([...c].filter(x=>s.has(x))):new Set(s);}
  if(!c||!c.size){none++;return;}if(c.size>1){multi++;return;}const nid=[...c][0];
  // any offset: smallest |k| in -50..50 with nid+k stored as a u32 somewhere in the tail
  const vals=new Map();for(let o=0;o+4<=t.length;o++){const v=t.readUInt32LE(o);if(!vals.has(v))vals.set(v,o);}
  let k=null;for(let a=0;a<=50&&k===null;a++)for(const s of a?[a,-a]:[0])if(k===null&&vals.has(nid+s))k=s;
  const key=k===null?'none':k+'@'+vals.get(nid+k);hist[key]=(hist[key]||0)+1;rows.push({fi,tid,nid,k:k===null?'none':k,at:k===null?null:vals.get(nid+k)});});
rows.sort((a,b)=>a.nid-b.nid);const runs=[];for(const r of rows){const l=runs[runs.length-1];if(l&&l.k===r.k){l.to=r.nid;l.n++;}else runs.push({k:r.k,from:r.nid,to:r.nid,n:1});}
console.log(file.split('/').pop(),'faces',d.faces.length,'tail<86',short,'no native face',none,'several',multi,'tail id - native face id (k@offset, top 12):',JSON.stringify(Object.entries(hist).sort((a,b)=>b[1]-a[1]).slice(0,12)),'keys',Object.keys(hist).length);
const big=runs.filter(r=>r.n>=3);console.log(' runs with >=3 faces',big.map(r=>r.from+'-'+r.to+':'+r.k+'('+r.n+')').join(' '));if(0)console.log(' runs',runs.length<=40?runs.map(r=>r.from+'-'+r.to+':'+r.k+'('+r.n+')').join(' '):runs.length);
for(const di of [75,448]){const r=rows.find(x=>x.fi===di);if(r)console.log(' face',di,JSON.stringify(r));}
