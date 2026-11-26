// EXP-118: is the unlabelled rim of a display face its stored bounding box? For each vertex of the
// face's unlabelled boundary loop, which of the six box planes (min/max x, y, z) it lies on (1e-9 m).
// usage: node boxclip.js <part> <face> [<face> ...]
const R='/home/user/solidworks-converters',S=require(R+'/src'),fs=require('fs');
const [file,...faces]=process.argv.slice(2),d=S.parse(fs.readFileSync(file));
for(const fi of faces.map(Number)){const f=d.faces[fi],V=i=>[0,1,2].map(k=>f.vertices[3*i+k]);
  console.log(`face ${fi} bounds field:`,JSON.stringify(f.bounds));
  // own box of all vertices, and of the labelled boundary vertices only
  const all=[...Array(f.vertices.length/3).keys()].map(V),lab=[],un=new Set();
  for(const a of f.edgeAnnotations)(a.id?lab:[]).push(...a.vertices.map(V));
  for(const a of f.edgeAnnotations)if(!a.id&&a.boundary!==false)0;
  const box=P=>[0,1,2].map(k=>[Math.min(...P.map(p=>p[k])),Math.max(...P.map(p=>p[k]))]);
  console.log('  box of all vertices   ',JSON.stringify(box(all).map(r=>r.map(x=>+x.toFixed(7)))));
  console.log('  box of labelled verts ',JSON.stringify(box(lab).map(r=>r.map(x=>+x.toFixed(7)))));
  const holes=JSON.parse(fs.readFileSync(__dirname+'/holes.json'));const h=(holes.find?holes.find(x=>x.face===fi):holes[fi]);
  const ring=(h&&(h.chain||h.vertices||h.points))||[];const rp=ring.map(x=>Array.isArray(x)?x:V(x));
  const B=f.bounds&&(f.bounds.min?[[f.bounds.min[0],f.bounds.max[0]],[f.bounds.min[1],f.bounds.max[1]],[f.bounds.min[2],f.bounds.max[2]]]:null)||box(all);
  const cnt={};let none=0;for(const p of rp){const on=[];for(let k=0;k<3;k++)for(let s=0;s<2;s++)if(Math.abs(p[k]-B[k][s])<1e-9)on.push('xyz'[k]+(s?'max':'min'));on.length?on.forEach(t=>cnt[t]=(cnt[t]||0)+1):none++;}
  console.log(`  rim vertices ${rp.length}: on a box plane`,JSON.stringify(cnt),'on none',none);
  const lo=[0,1,2].map(k=>Math.min(...rp.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...rp.map(p=>p[k])));
  console.log('  rim spread per axis (m):',[0,1,2].map(k=>(hi[k]-lo[k]).toExponential(2)).join(' '));
}
