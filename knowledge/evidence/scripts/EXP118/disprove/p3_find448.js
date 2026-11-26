// Which native face does display face 448 correspond to? Use geometry, not ids: native faces
// whose analytic surface the display vertices lie on (median and max residual), within the display bbox.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),J=require(L.R+'/src/brep/display-join'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
for(const di of (process.argv[2]||'75,448').split(',').map(Number)){
  const f=d.faces[di];const pts=[];for(let i=0;i<f.vertexCount;i++)pts.push([f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);
  const lo=[0,1,2].map(k=>Math.min(...pts.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...pts.map(p=>p[k])));
  console.log('display',di,'bbox',lo.map(x=>x.toFixed(5)),hi.map(x=>x.toFixed(5)),'stored bounds',f.bounds&&f.bounds.min.map(x=>x.toFixed(5)),f.bounds&&f.bounds.max.map(x=>x.toFixed(5)));
  const res=[];
  for(const nf of M.faces){if(J.residual(nf.surface,[0,0,0])===null)continue;
    const r=pts.map(p=>Math.abs(J.residual(nf.surface,p))).sort((a,b)=>a-b);
    if(r[r.length>>1]<1e-5)res.push({id:nf.id,type:nf.surface.type,r:nf.surface.r,med:r[r.length>>1],max:r[r.length-1],
      edges:nf.loops.map(l=>l.coedges.map(c=>c.edge).join('+')).join(' | ')});}
  res.sort((a,b)=>a.max-b.max);console.log(res.slice(0,8));
}
