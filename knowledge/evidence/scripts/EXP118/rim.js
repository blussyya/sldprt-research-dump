// EXP-118: the unlabelled rim of a display face (welded edges used by one triangle and carrying no
// Block1 id), and how it relates to the stored bounding box and to the bore axis.
// usage: node rim.js <part> <face> <native cylinder face id>
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const [file,fiS,nfS]=process.argv.slice(2),buf=fs.readFileSync(file),d=S.parse(buf),f=d.faces[+fiS],M=N.build(S.readBrep(buf).parsed);
const V=i=>[0,1,2].map(k=>f.vertices[3*i+k]),key=i=>V(i).join(','),T=f.triangleIndices,use=new Map(),lab=new Map();
for(let t=0;t<T.length;t+=3)for(const [a,b] of [[T[t],T[t+1]],[T[t+1],T[t+2]],[T[t+2],T[t]]]){const k=[key(a),key(b)].sort().join('|');use.set(k,(use.get(k)||0)+1);}
for(const a of f.edgeAnnotations)if(a.id){const k=[key(a.vertices[0]),key(a.vertices[1])].sort().join('|');lab.set(k,a.id);}
const rim=[...use].filter(([k,n])=>n===1&&!lab.has(k)).map(([k])=>k.split('|').map(s=>s.split(',').map(Number)));
const P=[...new Map(rim.flat().map(p=>[p.join(','),p])).values()];
const s=M.faces.find(x=>x.id===+nfS).surface,A=s.a,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const B=f.bounds,h=p=>dot(sub(p,s.p),A)*1e3;
console.log(`face ${fiS}: rim segments ${rim.length}, vertices ${P.length}`);
console.log('  stored box min',B.min.map(x=>x.toFixed(6)).join(' '),'max',B.max.map(x=>x.toFixed(6)).join(' '));
for(let k=0;k<3;k++){const v=P.map(p=>p[k]);console.log(`  rim ${'xyz'[k]}: ${Math.min(...v).toFixed(6)} to ${Math.max(...v).toFixed(6)}; vertices on box min ${v.filter(x=>Math.abs(x-B.min[k])<1e-9).length}, on box max ${v.filter(x=>Math.abs(x-B.max[k])<1e-9).length}, outside the box ${v.filter(x=>x<B.min[k]-1e-9||x>B.max[k]+1e-9).length}`);}
const hs=P.map(h);console.log(`  rim height along the bore axis ${Math.min(...hs).toFixed(3)} to ${Math.max(...hs).toFixed(3)} mm; axis`,A.map(x=>x.toFixed(4)).join(' '));
const all=[...Array(f.vertices.length/3).keys()].map(V);for(let k=0;k<3;k++){const v=all.map(p=>p[k]);console.log(`  all vertices ${'xyz'[k]}: outside the stored box ${v.filter(x=>x<B.min[k]-1e-9||x>B.max[k]+1e-9).length} of ${v.length}`);}
