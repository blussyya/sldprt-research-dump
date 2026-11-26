// EXP-118: native edge 1093 and loop 1 of face 2516 in full: vertex ids, which chart points the
// vertices are, and which branch of the closed chart the edge runs along in its own direction.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),M=N.build(S.readBrep(buf).parsed);
const E=id=>[...M.edges.values()].find(e=>e.displayId===id),VP=id=>{const v=M.vertices.get?M.vertices.get(id):M.vertices[id];return v.p||v.point||v;};
const bore=M.faces.find(f=>f.id===2516),A=bore.surface.a,P0=bore.surface.p,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
for(const l of bore.loops)console.log('loop',l.coedges.map(c=>{const e=M.edges.get(c.edge);return `${e.displayId}(v ${JSON.stringify(e.v)}, edge sameSense ${e.sameSense}, coedge sense ${c.sense})`;}).join(' -> '));
const e=E(1093),c=e.curve;console.log('1093 curve type',c.type,'keys',Object.keys(c).join(','));
const ch=(c.chart&&(c.chart.points||c.chart.pts||c.chart))||[];const pts=ch.map(x=>x.p||x);
const v0=VP(e.v[0]),v1=VP(e.v[1]);const near=(p,q)=>Math.hypot(...sub(p,q));
console.log('chart points',pts.length);pts.forEach((p,i)=>{const a=near(p,v0),b=near(p,v1);if(a<1e-6||b<1e-6)console.log(`  chart point ${i}: ${a<1e-6?'edge start vertex '+e.v[0]:''} ${b<1e-6?'edge end vertex '+e.v[1]:''}`);});
console.log('start/end H points:',['start','end'].map(k=>c[k]&&c[k].p?`${k} -> start vertex ${near(c[k].p,v0).toExponential(1)}, end vertex ${near(c[k].p,v1).toExponential(1)}`:k+' none').join(' | '));
