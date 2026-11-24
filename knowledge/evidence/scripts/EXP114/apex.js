// EXP-114: on the four 59-degree cones, which vertices carry the 62-degree normal mismatch, and how
// far are they from the cone's axis (0 = the apex).
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),
  J=require(R+'/src/brep/display-join'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),js=J.join(d.faces,M);
const deg=x=>x*180/Math.PI;
for(const fi of [21,24,27,30]){const df=d.faces[fi],nf=js[fi].face,s=nf.surface;const bad=[],good=[];
  for(let i=0;i<df.vertexCount;i++){
    const p=[0,1,2].map(k=>df.vertices[3*i+k]),n=[0,1,2].map(k=>df.normals[3*i+k]);
    const q=G.sub(p,s.p),h=G.dot(q,s.a),rho=G.norm(G.sub(q,G.mul(s.a,h)));
    const f=G.surfaceFoot(s,p),nn=G.mul(f.n,nf.sameSense===false?-1:1),a=deg(Math.acos(Math.max(-1,Math.min(1,G.dot(G.unit(n),G.unit(nn))))));
    (a>1?bad:good).push({i,rho,a});}
  console.log('display',fi,'| vertices off by >1 deg:',bad.length,'at distance from axis',bad.map(b=>b.rho.toExponential(1)+' ('+b.a.toFixed(3)+' deg)').join(', '),
    '| others:',good.length,'nearest to axis',Math.min(...good.map(g=>g.rho)).toExponential(2));}
