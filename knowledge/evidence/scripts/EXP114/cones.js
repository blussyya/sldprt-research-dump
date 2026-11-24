// EXP-114 (NQ-073): cone faces in "distributor main boss rev a" whose display normals disagree with
// the exact cone normal. Per joined cone face: the cone's parameters, display vertices' distance to
// the converter's cone, and the angle between each stored display normal and the converter's
// surface normal (surfaceFoot, times the face sense).
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),
  J=require(R+'/src/brep/display-join'),G=require(R+'/src/geom/eval'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),js=J.join(d.faces,M);
const deg=x=>x*180/Math.PI;
d.faces.forEach((df,fi)=>{const nf=js[fi]&&js[fi].face;if(!nf||nf.surface.type!=='cone')return;
  const s=nf.surface;let dmax=0,amax=0,amin=180;
  for(let i=0;i<df.vertexCount;i++){
    const p=[0,1,2].map(k=>df.vertices[3*i+k]),n=[0,1,2].map(k=>df.normals[3*i+k]);
    dmax=Math.max(dmax,Math.abs(G.surfaceDistance(s,p).d));
    const f=G.surfaceFoot(s,p),nn=G.mul(f.n,nf.sameSense===false?-1:1),a=deg(Math.acos(Math.max(-1,Math.min(1,G.dot(G.unit(n),G.unit(nn))))));
    amax=Math.max(amax,a);amin=Math.min(amin,a);}
  console.log('display',fi,'native',nf.id,'faceSense',nf.sameSense,'cone',JSON.stringify(Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Array.isArray(v)?v.map(x=>+x.toFixed(6)):(typeof v==='number'?+v.toFixed(8):v)]))),
    '| vertices',df.vertexCount,'max dist',dmax.toExponential(2),'| normal angle min',amin.toFixed(3),'max',amax.toFixed(3));
});
