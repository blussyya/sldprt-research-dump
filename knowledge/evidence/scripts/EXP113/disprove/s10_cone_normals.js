// Cone faces: per display vertex, angle between display normal and exact outward normal
// (natural normal radial*cos(a) - axis*sin(a), flipped when the converter's face.sameSense is false).
// Classes: apex (distance to the exact apex < 1e-6 m) vs other. Also the area-weighted triangle normal at each vertex.
// Controls: the same measurement on cylinders and planes of the same part (must be ~0), and an "opposite sign" variant.
const L=require('./lib.js');const name=process.argv[2];const {d,N,j}=L.load(L.PARTS[name]||name);
const {sub,dot,norm,cross}=L;const un=a=>{const n=norm(a);return n?a.map(x=>x/n):a;};
const deg=x=>x*180/Math.PI;
function exactN(s,p,same){// cone/cylinder/plane
  if(s.type==='plane')return s.n.map(x=>x*(same?1:-1));
  const q=sub(p,s.p),h=dot(q,s.a),rad=sub(q,s.a.map(x=>x*h)),rho=norm(rad);if(rho<1e-12)return null;const r=rad.map(x=>x/rho);
  let n;if(s.type==='cylinder')n=r;else{const ca=Math.cos(s.angle),sa=Math.sin(s.angle);n=r.map((x,i)=>x*ca-s.a[i]*sa);}
  return n.map(x=>x*(same?1:-1));}
const rows=[];
d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face)return;const nf=m.face,s=nf.surface;if(!['cone','cylinder','plane'].includes(s.type))return;
  // apex
  let apex=null;if(s.type==='cone'){const t=Math.tan(s.angle);apex=sub(s.p,s.a.map(x=>x*s.r/t));}
  // triangle normals per vertex
  const tn=new Float64Array(f.vertexCount*3);const T=f.triangleIndices;
  for(let t=0;t+2<T.length;t+=3){const a=L.vtx(f,T[t]),b=L.vtx(f,T[t+1]),c=L.vtx(f,T[t+2]);const n=cross(sub(b,a),sub(c,a));for(let q=0;q<3;q++)for(let i=0;i<3;i++)tn[T[t+q]*3+i]+=n[i];}
  const R={part:name,face:nf.displayId,how:m.how,type:s.type,half:s.type==='cone'?+deg(s.angle).toFixed(3):null,n:f.vertexCount,same:nf.sameSense,
    maxRes:0,maxAngNonApex:0,maxAngApex:0,nApex:0,nBadNonApex:0,maxAngTriNonApex:0,flipFrac:0,maxAngFlipped:0,worstNonApex:null};
  let flipped=0;
  for(let k=0;k<f.vertexCount;k++){const p=L.vtx(f,k);R.maxRes=Math.max(R.maxRes,Math.abs(L.DJ.residual(s,p)));
    const dn=[f.normals[3*k],f.normals[3*k+1],f.normals[3*k+2]];const en=exactN(s,p,nf.sameSense);
    const isApex=apex&&norm(sub(p,apex))<1e-6;
    if(isApex){R.nApex++;if(en){/*undefined normal at apex*/}
      // angle to the normal of the generator ring: compare to the cone normal at the display normal's own azimuth is meaningless; use max over possible azimuths = report angle to axis plane
      const ang=en?deg(Math.acos(Math.max(-1,Math.min(1,dot(un(dn),en))))):null;R.maxAngApex=Math.max(R.maxAngApex,ang||0);continue;}
    if(!en)continue;const c=dot(un(dn),en);const ang=deg(Math.acos(Math.max(-1,Math.min(1,c))));
    if(ang>R.maxAngNonApex){R.maxAngNonApex=ang;R.worstNonApex={k,p,ang,rho:norm(sub(p,s.p))};}
    if(ang>1)R.nBadNonApex++;
    if(c<0)flipped++;
    const tv=un([tn[3*k],tn[3*k+1],tn[3*k+2]]);R.maxAngTriNonApex=Math.max(R.maxAngTriNonApex,deg(Math.acos(Math.max(-1,Math.min(1,dot(tv,en))))));
  }
  R.flipFrac=flipped/f.vertexCount;rows.push(R);});
const fmt=x=>typeof x==='number'?+x.toPrecision(3):x;
const by={};for(const r of rows){(by[r.type]=by[r.type]||[]).push(r)}
for(const t of Object.keys(by)){const A=by[t];console.log(name,t,'faces',A.length,'max |res|',Math.max(...A.map(r=>r.maxRes)).toExponential(1),'max angle non-apex',fmt(Math.max(...A.map(r=>r.maxAngNonApex))),'faces with non-apex angle>1deg',A.filter(r=>r.nBadNonApex).length,'faces with flipped>0.5',A.filter(r=>r.flipFrac>0.5).length,'max tri-normal angle',fmt(Math.max(...A.map(r=>r.maxAngTriNonApex))));}
for(const r of (by.cone||[]))console.log(' cone',r.face,r.how,'half',r.half,'n',r.n,'sameSense',r.same,'apexVerts',r.nApex,'maxRes',r.maxRes.toExponential(1),'angNonApex',fmt(r.maxAngNonApex),'angApex',fmt(r.maxAngApex),'bad>1deg',r.nBadNonApex,'flipFrac',fmt(r.flipFrac),'triAng',fmt(r.maxAngTriNonApex));
