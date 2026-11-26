// Per point: distance from each vertex and midpoint of the unlabelled chain of faces 75 and 448 to
// the nearest triangle of any other display face. Control: the same for the labelled boundary
// segments, which are shared exactly with neighbours (expected 0).
const L=require('./lib'),G=require('./geo');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
const {sub,dot,norm}=G;
function ptTri(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);const d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return norm(ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return norm(bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return norm(sub(p,[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]]));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return norm(cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return norm(sub(p,[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]]));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));const bc=sub(c,b);return norm(sub(p,[b[0]+w*bc[0],b[1]+w*bc[1],b[2]+w*bc[2]]));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return norm(sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]));}
function nearest(fi,p){let best=Infinity,who=-1;faces.forEach((g,gi)=>{if(gi===fi)return;const b=conv.faces[gi].bounds;if(b&&[0,1,2].some(k=>b.min[k]>p[k]+2e-3||b.max[k]<p[k]-2e-3))return;
  for(const t of g.tris){const d=ptTri(p,...t.map(i=>g.pos[i]));if(d<best){best=d;who=gi;}}});return {d:best,who};}
for(const fi of [75,448]){const M=L.meshEdges(faces[fi]);
  for(const [name,sel] of [['unlabelled',e=>e.ids.every(x=>!x)],['labelled (control)',e=>e.ids.some(x=>x)]]){
    const segs=M.boundary.filter(sel),ds=[],who={};
    for(const s of segs){const a=L.P(s.a),b=L.P(s.b);for(const p of [a,G.mul(G.add(a,b),0.5)]){const r=nearest(fi,p);ds.push(r.d);who[r.who]=(who[r.who]||0)+1;}}
    ds.sort((x,y)=>x-y);const c=t=>ds.filter(d=>d<=t).length;
    console.log(JSON.stringify({face:fi,set:name,points:ds.length,min:ds[0].toExponential(2),median:ds[ds.length>>1].toExponential(2),max:ds[ds.length-1].toExponential(2),within1e7:c(1e-7),within1e6:c(1e-6),within1e5:c(1e-5),within1e4:c(1e-4),nearestFaces:who}));}}
