// EXP-114: the native extent of the four 59-degree cone faces: their edges and vertices, and the
// display face's stored bounding box.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),
  J=require(R+'/src/brep/display-join'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),js=J.join(d.faces,M);
for(const fi of [21,24]){const df=d.faces[fi],nf=js[fi].face,s=nf.surface;
  const apexDist=q=>{const v=G.sub(q,s.p),h=G.dot(v,s.a);return G.norm(G.sub(v,G.mul(s.a,h)));};
  console.log('display',fi,'bounds',JSON.stringify(df.bounds&&{min:df.bounds.min,max:df.bounds.max,radius:df.bounds.radius}));
  for(const l of nf.loops)for(const ce of l.coedges){const e=M.edges.get(ce.edge);
    const vs=(e.v||[]).map(v=>M.vertices.get(v)).filter(Boolean).map(v=>v.p||v.point||v);
    console.log('  edge',e.id,e.curve&&e.curve.type,e.curve&&e.curve.r!==undefined?'r '+e.curve.r:'','| vertices',JSON.stringify(vs).slice(0,160),'| vertex dist from axis',vs.map(p=>Array.isArray(p)?apexDist(p).toExponential(2):'?').join(' '));}
}
