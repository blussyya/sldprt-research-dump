// Claim 3: display faces 448 and 75 are mirror images in x = 0.
// (a) display meshes: 448's vertices mirrored (x -> -x) against 75's triangles and the reverse;
//     bar 1.2e-5 m = chord sag of a 24-segment circle of r 1.35 mm (L^2/8r), since the two
//     tessellations differ. Exact float32 matches of mirrored vertices are counted too.
//     Mirrored vertices on native cylinder 2516 (bar 1e-7 m for interior/circle vertices).
// (b) native faces 2516 and 12990: surface, circles, vertices, intersection charts, mirrored;
//     bar 1e-12 m. Controls: the same comparison of 2516 against an unrelated cylinder face must
//     fail; mirroring 75 onto itself must fail (75 is not symmetric in x = 0); a mirror in x = 1e-6 must
//     raise the (b) numbers to ~2e-6.
// (c) the unlabelled chains: 448's mirrored chain against 75's chain (polyline distance both ways).
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));const V=id=>m.vertices.get(id).p;
const {sub,dot,norm}=G;
function ptTri(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);const d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return norm(ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return norm(bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return norm(sub(p,[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]]));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return norm(cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return norm(sub(p,[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]]));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));const bc=sub(c,b);return norm(sub(p,[b[0]+w*bc[0],b[1]+w*bc[1],b[2]+w*bc[2]]));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return norm(sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]));}
const X0=+(process.argv[2]||0);const mir=p=>[2*X0-p[0],p[1],p[2]];
const st=a=>{a=a.slice().sort((x,y)=>x-y);return {n:a.length,max:+a[a.length-1].toExponential(2),median:+a[a.length>>1].toExponential(2),over:a.filter(x=>x>1.2e-5).length};};
function meshVsMesh(A,B){return A.pos.map(p=>Math.min(...B.tris.map(t=>ptTri(mir(p),...t.map(i=>B.pos[i])))));}
console.log('mirror plane x =',X0);
console.log('(a) 448 mirrored -> 75 triangles',JSON.stringify(st(meshVsMesh(faces[448],faces[75]))),'| 75 mirrored -> 448 triangles',JSON.stringify(st(meshVsMesh(faces[75],faces[448]))));
{const k75=new Set(faces[75].pos.map(L.key));const ex=new Set(faces[448].pos.map(p=>L.key([Math.fround(2*X0-p[0]),p[1],p[2]])).filter(k=>k75.has(k)));console.log('    mirrored 448 vertices exactly equal (float32) to a 75 vertex:',ex.size,'of',new Set(faces[448].pos.map(L.key)).size,'distinct');}
{const s=m.faces.find(f=>f.id===2516).surface;const d=faces[448].pos.map(p=>G.distSurface(mir(p),s));const d75=faces[75].pos.map(p=>G.distSurface(p,s));console.log('    on cylinder 2516: 448 mirrored max',Math.max(...d).toExponential(2),'| 75 itself max',Math.max(...d75).toExponential(2));}
console.log('    control: 75 mirrored -> 75 triangles',JSON.stringify(st(meshVsMesh(faces[75],faces[75]))));
// (b) native
function cmpNative(fa,fb){const A=m.faces.find(f=>f.id===fa),B=m.faces.find(f=>f.id===fb);const out={};
  const sa=A.surface,sb=B.surface;out.radius=Math.abs(sa.r-sb.r);
  // axis: mirrored point of B's axis must lie on A's axis; mirrored direction parallel
  const ma=[-sb.a[0],sb.a[1],sb.a[2]];out.axisPoint=norm(G.perp(sub(mir(sb.p),sa.p),G.unit(sa.a)));out.axisDir=1-Math.abs(dot(G.unit(ma),G.unit(sa.a)));
  // edges: match each edge of B to the edge of A whose mirrored geometry is nearest
  const eA=A.loops.flatMap(l=>l.coedges.map(c=>m.edges.get(c.edge))),eB=B.loops.flatMap(l=>l.coedges.map(c=>m.edges.get(c.edge)));
  const pairs=[];for(const b of eB){let best=null;for(const a of eA){if(a.curve.type!==b.curve.type)continue;let d;
      if(a.curve.type==='circle'){d=Math.max(norm(sub(mir(b.curve.c),a.curve.c)),Math.abs(a.curve.r-b.curve.r),1-Math.abs(dot(G.unit([-b.curve.n[0],b.curve.n[1],b.curve.n[2]]),G.unit(a.curve.n))));}
      else if(a.curve.type==='intersection'){if(a.curve.chart.length!==b.curve.chart.length)continue;d=Math.max(...a.curve.chart.map((p,i)=>norm(sub(p,mir(b.curve.chart[i])))));}
      if(!best||d<best.d)best={a:a.id,d};}
    const a=best&&m.edges.get(best.a);let vd=null;if(a&&a.v&&b.v){vd=Math.max(...[0,1].map(k=>norm(sub(mir(V(b.v[k])),V(a.v[k])))));}
    pairs.push({b:b.id,a:best&&best.a,type:b.curve.type,geom:best&&+best.d.toExponential(2),vertices:vd===null?null:+vd.toExponential(2),sameSense:a?[a.sameSense,b.sameSense].join('/'):null});}
  out.edges=pairs;out.loopsA=A.loops.map(l=>l.coedges.map(c=>c.edge+(c.sense?'+':'-')).join(' '));out.loopsB=B.loops.map(l=>l.coedges.map(c=>c.edge+(c.sense?'+':'-')).join(' '));out.sameSense=[A.sameSense,B.sameSense];
  return out;}
console.log('(b) native 2516 vs mirrored 12990',JSON.stringify(cmpNative(2516,12990)));
// control: an unrelated cylinder of the same radius
const other=m.faces.find(f=>f.surface.type==='cylinder'&&f.id!==2516&&f.id!==12990&&Math.abs(f.surface.r-0.00135)<1e-9&&f.id!==12997);
if(other)console.log('    control: 2516 vs mirrored',other.id,JSON.stringify((({radius,axisPoint,axisDir})=>({radius,axisPoint,axisDir}))(cmpNative(2516,other.id))));
// (c) unlabelled chains
function chainPts(f){const M=L.meshEdges(f);return M.boundary.filter(e=>e.ids.every(x=>!x)).map(e=>[L.P(e.a),L.P(e.b)]);}
const c75=chainPts(faces[75]),c448=chainPts(faces[448]).map(s=>s.map(mir));
const pd=(P,S)=>P.map(p=>Math.min(...S.map(s=>G.distSeg(p,s[0],s[1]))));
const s1=pd(c448.flat(),c75),s2=pd(c75.flat(),c448);
console.log('(c) unlabelled chains: 448 mirrored -> 75 chain max',Math.max(...s1).toExponential(2),'median',s1.sort((a,b)=>a-b)[s1.length>>1].toExponential(2),'| 75 -> 448 mirrored max',Math.max(...s2).toExponential(2),'| segments',c75.length,c448.length);
// (d) by vertex role: which mirrored vertices are over the chord-sag bar, and exact matches per role
function roleOf(f){const M=L.meshEdges(f),lab=new Set(),unl=new Set();for(const e of M.boundary){const s=e.ids.some(x=>x)?lab:unl;s.add(e.a);s.add(e.b);}return k=>lab.has(k)&&unl.has(k)?'both':lab.has(k)?'labelled':unl.has(k)?'chain':'interior';}
for(const [A,B,name] of [[448,75,'448 mirrored -> 75'],[75,448,'75 mirrored -> 448']]){const r=roleOf(faces[A]),kB=new Set(faces[B].pos.map(L.key));const out={};const seen=new Set();
  faces[A].pos.forEach(p=>{const k=L.key(p);if(seen.has(k))return;seen.add(k);const role=r(k);const d=Math.min(...faces[B].tris.map(t=>ptTri(mir(p),...t.map(i=>faces[B].pos[i]))));
    const o=out[role]=out[role]||{n:0,exact:0,over:0,max:0};o.n++;if(kB.has(L.key([Math.fround(2*X0-p[0]),p[1],p[2]])))o.exact++;if(d>1.2e-5)o.over++;o.max=Math.max(o.max,d);});
  for(const k in out)out[k].max=+out[k].max.toExponential(2);console.log('(d)',name,'by role of the vertex:',JSON.stringify(out));}
