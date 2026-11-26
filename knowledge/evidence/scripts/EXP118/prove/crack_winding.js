// Two reader-error checks on faces 75 and 448.
// (a) crack test: could the unlabelled chain be an unwelded internal seam of the face itself?
//     For each chain segment midpoint, the distance to the face's own triangles that share no
//     vertex with that segment. A crack would give ~0. Control: a labelled ring segment (same test, expected > 0),
//     and a synthetic crack made by shifting one strip's vertices by 1e-7 m (expected ~1e-7).
// (b) winding: own triangles vs stored normals, whole file, to see whether 75/448's few flips are unusual.
const L=require('./lib'),G=require('./geo');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
const {sub,dot,norm,cross}=G;
function ptTri(p,a,b,c){const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);const d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return norm(ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return norm(bp);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return norm(sub(p,[a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]]));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return norm(cp);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return norm(sub(p,[a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]]));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));const bc=sub(c,b);return norm(sub(p,[b[0]+w*bc[0],b[1]+w*bc[1],b[2]+w*bc[2]]));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return norm(sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]));}
function crack(f,sel){const M=L.meshEdges(f),K=M.K;const segs=M.boundary.filter(sel);const ds=[];
  for(const s of segs){const a=L.P(s.a),b=L.P(s.b),mid=G.mul(G.add(a,b),0.5);let mn=Infinity;
    for(const t of f.tris){const k=t.map(i=>K[i]);if(k.includes(s.a)||k.includes(s.b))continue;const d=ptTri(mid,...t.map(i=>f.pos[i]));if(d<mn)mn=d;}ds.push(mn);}
  ds.sort((x,y)=>x-y);const e=x=>+x.toExponential(2);
  return {segs:segs.length,distToOwnNonAdjacentTriangles:{min:e(ds[0]),median:e(ds[ds.length>>1]),max:e(ds[ds.length-1])}};}
for(const fi of [75,448]){const f=faces[fi];
  console.log('face',fi,'unlabelled chain',JSON.stringify(crack(f,e=>e.ids.every(x=>!x))),'labelled (control)',JSON.stringify(crack(f,e=>e.ids.some(x=>x))));}
// synthetic crack control: shift strip 8 of face 75; tested: segments that were interior before the shift by 1e-7 m in x so it no longer welds to its neighbours
{const f=faces[75];let v0=0;for(let s=0;s<8;s++)v0+=f.strips[s];const g={...f,pos:f.pos.map((p,i)=>i>=v0&&i<v0+f.strips[8]?[Math.fround(p[0]+1e-7),p[1],p[2]]:p)};
 const M=L.meshEdges(g);const un=M.boundary.filter(e=>e.ids.every(x=>!x));
 // a new crack segment: unlabelled boundary now, and it was an interior edge (used twice) before the shift
 const M0=L.meshEdges(f),K0=M0.K,keyMap=new Map();g.pos.forEach((p,i)=>keyMap.set(L.key(p),K0[i]));
 g._new=e=>{if(!e.ids.every(x=>!x))return false;const a=keyMap.get(e.a),b=keyMap.get(e.b),pk=a<b?a+'|'+b:b+'|'+a;const u=M0.use.get(pk);return !!u&&u.n===2;};console.log('synthetic crack control (face 75, strip 8 shifted 1e-7 m in x): unlabelled boundary segments',un.length,JSON.stringify(crack(g,g._new)));}
// winding over the whole file
let agree=0,dis=0;const perFace=[];
faces.forEach((f,fi)=>{let d=0;for(const t of f.tris){const [a,b,c]=t.map(i=>f.pos[i]);const n=cross(sub(b,a),sub(c,a));if(norm(n)===0)continue;const m=[0,1,2].map(k=>f.nor[t[0]][k]+f.nor[t[1]][k]+f.nor[t[2]][k]);if(dot(n,m)>0)agree++;else{dis++;d++;}}if(d)perFace.push([fi,d]);});
console.log('whole file: triangles agreeing with stored normals',agree,'disagreeing',dis,'faces with any disagreement',perFace.length,'top',JSON.stringify(perFace.sort((a,b)=>b[1]-a[1]).slice(0,10)));
// where the flipped triangles of 75 and 448 are: do they touch the unlabelled chain?
for(const fi of [75,448]){const f=faces[fi],M=L.meshEdges(f),un=new Set();for(const e of M.boundary)if(e.ids.every(x=>!x)){un.add(e.a);un.add(e.b);}
  const out=[];for(const t of f.tris){const [a,b,c]=t.map(i=>f.pos[i]);const n=cross(sub(b,a),sub(c,a));const m=[0,1,2].map(k=>f.nor[t[0]][k]+f.nor[t[1]][k]+f.nor[t[2]][k]);if(dot(n,m)<=0)out.push({area:(norm(n)/2).toExponential(2),onChain:t.filter(i=>un.has(M.K[i])).length});}
  console.log('face',fi,'flipped triangles',JSON.stringify(out));}
