// EXP-118: around the bore, where the display puts edge 1166's label, 1093's label and the unlabelled
// rim, against the two native vertices V1, V2 (degrees around the axis, 0 = V1, measured the way the
// circle runs from V1 to V2). Also how much of the 360 degrees the display face covers near its rim.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),f=d.faces[75];
const E=id=>[...M.edges.values()].find(x=>x.displayId===id),P=v=>{const vv=M.vertices.get(v);return vv.p||vv.point;};
const e=E(1166),c=e.curve,t0=G.curveProject(c,P(e.v[0])).t,t1=G.curveProject(c,P(e.v[1])).t;
const deg=p=>{let t=G.curveProject(c,p).t-t0;t=((t%(2*Math.PI))+2*Math.PI)%(2*Math.PI);return t*180/Math.PI;};
console.log('V2 at',deg(P(e.v[1])).toFixed(1),'deg from V1 along circle 1166');
const V=i=>[0,1,2].map(k=>f.vertices[3*i+k]),key=i=>V(i).join(','),pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;
const use=new Map();for(let t=0;t<f.triangleIndices.length;t+=3){const ix=[0,1,2].map(j=>f.triangleIndices[t+j]);for(const [a,b] of [[0,1],[1,2],[0,2]]){const k=pk(key(ix[a]),key(ix[b]));use.set(k,(use.get(k)||0)+1);}}
const lab=new Map();for(const e2 of f.edgeAnnotations)if(e2.id)lab.set(pk(key(e2.vertices[0]),key(e2.vertices[1])),{id:e2.id,a:V(e2.vertices[0]),b:V(e2.vertices[1])});
const span=list=>{const ds=list.flatMap(([a,b])=>[deg(a),deg(b)]);return ds.length?`${Math.min(...ds).toFixed(1)} to ${Math.max(...ds).toFixed(1)} deg, ${list.length} segments, total arc ${list.reduce((s,[a,b])=>{let x=Math.abs(deg(a)-deg(b));if(x>180)x=360-x;return s+x;},0).toFixed(1)} deg`:'none';};
for(const id of [1166,1093])console.log('label',id,':',span([...lab.values()].filter(x=>x.id===id).map(x=>[x.a,x.b])));
const pos=new Map();for(let i=0;i<f.vertexCount;i++)pos.set(key(i),V(i));
const red=[...use].filter(([k,n])=>n===1&&!lab.has(k)).map(([k])=>k.split('|').map(x=>pos.get(x)));
console.log('unlabelled rim:',span(red));
