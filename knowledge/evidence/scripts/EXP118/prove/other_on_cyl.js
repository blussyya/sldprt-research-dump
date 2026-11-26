// Does any other display face of f666f342 carry triangles on cylinder 2516 (or its mirror 12990)?
// A triangle counts when its centroid is within 2e-5 m of the cylinder (the chord sag of the
// coarsest 24-segment tessellation is 1.2e-5 m) and within the face's axial range +-1 mm.
// Control: faces 75 and 448 themselves must count nearly all their triangles.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
for(const sid of [2516,12990]){const s=m.faces.find(f=>f.id===sid).surface,a=G.unit(s.a);const h=p=>G.dot(G.sub(p,s.p),a);
  const out=[];faces.forEach((f,fi)=>{let n=0;for(const t of f.tris){const c=G.mul(G.add(G.add(f.pos[t[0]],f.pos[t[1]]),f.pos[t[2]]),1/3);if(G.distSurface(c,s)<=2e-5&&h(c)<-0.0033&&h(c)>-0.0093)n++;}if(n)out.push(fi+':'+n+'/'+f.tris.length);});
  console.log('cylinder',sid,'display faces with triangles on it:',out.join(' '));}
