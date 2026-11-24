'use strict';
/* Claim 2: cone faces of a part. Own closed-form cone distance and normal.
 * usage: node claim2.js file [minDeg maxDeg]   (half-angle window, default 58.5..59.5)
 * Prints, per matching cone face: vertices, apex copies, triangle structure, max distance to the cone
 * (and in float32 ulps), normal angle at non-apex vertices, and what the apex copies carry. */
const L=require('./lib');
const R=180/Math.PI;
const file=process.argv[2],lo=+(process.argv[3]||58.5),hi=+(process.argv[4]||59.5);
const W=L.load(file);
function nat(s,p){   // natural (d_u x d_v) cone normal at p: cos(a) e - sin(a) axis, e = radial unit vector
  const q=L.sub(p,s.p),h=L.dot(q,s.a),rad=L.sub(q,L.mul(s.a,h)),rho=L.nrm(rad);
  if(rho<1e-12)return null;const e=L.mul(rad,1/rho);
  return L.sub(L.mul(e,Math.cos(s.angle)),L.mul(s.a,Math.sin(s.angle)));
}
function nAt(s,az){const y=L.cross(s.a,s.x),e=L.add(L.mul(s.x,Math.cos(az)),L.mul(y,Math.sin(az)));return L.sub(L.mul(e,Math.cos(s.angle)),L.mul(s.a,Math.sin(s.angle)));}
function az(s,p){const q=L.sub(p,s.p),y=L.cross(s.a,s.x);return Math.atan2(L.dot(q,y),L.dot(q,s.x));}
const ang=(a,b)=>Math.acos(Math.max(-1,Math.min(1,L.dot(a,b)/(L.nrm(a)*L.nrm(b)))))*R;
const dAz=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};

const allCones=W.M.faces.filter(f=>f.surface.type==='cone');
console.log('native cone faces',allCones.length,'half-angles (deg):',[...new Set(allCones.map(f=>(f.surface.angle*R).toFixed(3)))].join(' '));
let nFace=0;
W.df.forEach((df,k)=>{
  const m=W.j[k];if(!m.face||m.face.surface.type!=='cone')return;
  const s=m.face.surface,deg=s.angle*R;if(deg<lo||deg>hi)return;nFace++;
  const V=df.vertices,Nn=df.normals,T=df.triangleIndices,n=df.vertexCount;
  const sgn=m.face.sameSense?1:-1;
  const P=v=>[V[3*v],V[3*v+1],V[3*v+2]],NV=v=>[Nn[3*v],Nn[3*v+1],Nn[3*v+2]];
  const q0=L.sub(P(0),s.p);
  // apex: the point where the radius r + h tan(a) is zero
  const hA=-s.r/Math.tan(s.angle),apex=L.add(s.p,L.mul(s.a,hA));
  let maxD=0,maxQ=0,maxQratio=0;const apexIdx=[],others=[];
  for(let v=0;v<n;v++){const p=P(v),d=Math.abs(L.surfDist(s,p));maxD=Math.max(maxD,d);
    const Q=0.87*Math.max(...p.map(L.ulp32));maxQ=Math.max(maxQ,Q);maxQratio=Math.max(maxQratio,d/Q);
    if(L.dist(p,apex)<1e-6)apexIdx.push(v);else others.push(v);}
  const apexSet=new Set(apexIdx);
  // normals at non-apex vertices against the closed-form normal at the same point
  let maxNon=0,flip=0;for(const v of others){const e=nat(s,P(v));if(!e)continue;const a=ang(NV(v),L.mul(e,sgn));maxNon=Math.max(maxNon,Math.min(a,180-a));if(a>90)flip++;}
  // triangles: apex copies per triangle
  let nT=T.length/3;const perTri={};const usedApex=new Map();
  for(let t=0;t<T.length;t+=3){let c=0;for(let e=0;e<3;e++)if(apexSet.has(T[t+e])){c++;usedApex.set(T[t+e],(usedApex.get(T[t+e])||0)+1);}perTri[c]=(perTri[c]||0)+1;}
  // apex copies: what normal do they carry?
  const rows=[];
  for(const v of apexIdx){
    const nv=NV(v),nz=L.dot(nv,s.a)/L.nrm(nv);           // exact cone: |n . axis| = sin(alpha)
    const tris=[];for(let t=0;t<T.length;t+=3)for(let e=0;e<3;e++)if(T[t+e]===v)tris.push([T[t+(e+1)%3],T[t+(e+2)%3]]);
    // normal's own azimuth (radial part) against the azimuths of the two base vertices of its triangle
    const rad=L.sub(nv,L.mul(s.a,L.dot(nv,s.a)));const own=Math.atan2(L.dot(rad,L.cross(s.a,s.x))*sgn,L.dot(rad,s.x)*sgn);
    const row={v,nzDeg:Math.asin(Math.min(1,Math.abs(nz)))*R,tris:tris.length};
    if(tris.length){const [b,c]=tris[0];const ab=az(s,P(b)),ac=az(s,P(c));
      const span=Math.abs(dAz(ab,ac)),mid=ab+dAz(ac,ab)/2*1;   // mid azimuth between base vertices
      row.baseAzSpanDeg=span*R;
      const dev=(base)=>ang(L.mul(nv,sgn),nAt(s,base));
      row.angToNormalAtB=dev(ab);row.angToNormalAtC=dev(ac);row.angToNormalAtMid=dev(ab+dAz(ac,ab)/2);
      row.ownAzMinusB=dAz(own,ab)*R;row.ownAzMinusC=dAz(own,ac)*R;
      row.between=Math.abs(dAz(own,ab))+Math.abs(dAz(own,ac))<=span+1e-3;}
    rows.push(row);}
  // 62 deg check: angle between the normal of each apex copy and ONE fixed reference generator
  const apexN=apexIdx.map(v=>L.mul(NV(v),sgn)),refs={'face x-axis generator (az 0)':nAt(s,0),'generator of first apex copy':apexN[0]};
  const maxPair=Math.max(...apexN.flatMap((a,i)=>apexN.map((b,j)=>j>i?ang(a,b):0)));
  const refMax=Object.fromEntries(Object.entries(refs).map(([k,r])=>[k,Math.max(...apexN.map(a=>ang(a,r))).toFixed(3)]));
  const own=rows.map(r=>Math.min(r.angToNormalAtB,r.angToNormalAtC));
  console.log(`   apex copy vs exact normal on ITS OWN generator (nearer of the two base-vertex generators): max ${Math.max(...own).toExponential(2)} deg over ${own.length}; vs one fixed reference generator: ${JSON.stringify(refMax)}; largest angle between two apex copies ${maxPair.toFixed(3)} (180-2*alpha = ${(180-2*deg).toFixed(3)} is the opposite-generator value ... cos t = sin^2a - cos^2a gives ${(Math.acos(Math.sin(s.angle)**2-Math.cos(s.angle)**2)*R).toFixed(3)})`);
  // controls on this face
  {const ctl={};
   // (1) a vertex moved radially by d is caught by the 1e-9 bar
   for(const d of [2e-9,5e-9,1e-8,1e-7]){let caught=0,tot=0;for(const v of others){const p=P(v),q=L.sub(p,s.p),h=L.dot(q,s.a),rad=L.sub(q,L.mul(s.a,h)),rn=L.nrm(rad);
      const pm=L.add(p,L.mul(rad,d/rn)).map(Math.fround);tot++;if(Math.abs(L.surfDist(s,pm))>1e-9)caught++;}ctl['moved '+d+' m']=caught+'/'+tot;}
   // (2) a non-apex normal turned by d deg is caught by the angle measurement (bar 0.01 deg)
   for(const dd of [0.05,1,10]){let caught=0,tot=0;for(const v of others){const e=L.mul(nat(s,P(v)),sgn),t=L.unitPerp?null:null;
      const ax=L.cross(e,s.a),axn=L.nrm(ax)||1,u=L.mul(ax,1/axn),r=dd/R,nn=L.add(L.mul(e,Math.cos(r)),L.mul(L.cross(u,e),Math.sin(r)));
      tot++;if(ang(nn,e)>0.01)caught++;}ctl['normal turned '+dd+' deg']=caught+'/'+tot;}
   console.log('   controls (caught/tried):',JSON.stringify(ctl));}
  const st=(f)=>{const a=rows.map(f).filter(Number.isFinite);return a.length?[Math.min(...a),Math.max(...a)].map(x=>x.toFixed(3)).join('..'):'-';};
  console.log(`face ${m.face.id} (join ${m.how}) half-angle ${deg.toFixed(4)} sameSense ${m.face.sameSense} verts ${n} tris ${nT} apexCopies ${apexIdx.length} trianglesByApexCount ${JSON.stringify(perTri)} apexCopiesShared ${[...usedApex.values()].filter(x=>x>1).length}`);
  console.log(`   distance to cone, all ${n} vertices: max ${maxD.toExponential(2)} m (float32 rounding bar ${maxQ.toExponential(2)} m; worst d/bar ${maxQratio.toFixed(2)}); over 1e-9: ${others.concat(apexIdx).filter(v=>Math.abs(L.surfDist(s,P(v)))>1e-9).length}`);
  console.log(`   non-apex normals vs exact normal at the same point: max ${maxNon.toExponential(2)} deg over ${others.length} vertices (flipped sign ${flip})`);
  console.log(`   apex copies: normal elevation vs axis (asin|n.axis|, exact cone: half-angle ${deg.toFixed(3)}) ${st(r=>r.nzDeg)}; angle to exact normal at base-vertex B ${st(r=>r.angToNormalAtB)}, at C ${st(r=>r.angToNormalAtC)}, at mid ${st(r=>r.angToNormalAtMid)}; base azimuth span ${st(r=>r.baseAzSpanDeg)}; normal azimuth between B and C: ${rows.filter(r=>r.between).length}/${rows.length}`);
  console.log(`   apex normals all different: ${new Set(apexIdx.map(v=>NV(v).map(x=>x.toFixed(5)).join())).size} distinct of ${apexIdx.length}`);
});
console.log('matching display faces',nFace,'; native cone faces in the window',allCones.filter(f=>f.surface.angle*R>=lo&&f.surface.angle*R<=hi).length,'ids',allCones.filter(f=>f.surface.angle*R>=lo&&f.surface.angle*R<=hi).map(f=>f.id).join(','));
