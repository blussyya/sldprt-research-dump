// distributor main boss: what are the display normals at the apex copies? Compare to the exact cone normal at the azimuth of every triangle neighbour (limit along each generator).
const L=require('./lib.js');const {d,j}=L.load(L.PARTS.distributor);const {sub,dot,norm,cross}=L;const un=a=>{const n=norm(a);return a.map(x=>x/n)};const deg=x=>x*180/Math.PI;
const ang=(a,b)=>deg(Math.acos(Math.max(-1,Math.min(1,dot(un(a),un(b))))));
for(const want of [624,703,782,861,348,634]){
 d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face||m.face.displayId!==want||m.face.surface.type!=='cone')return;const s=m.face.surface,nf=m.face,sg=nf.sameSense?1:-1;
  const t=Math.tan(s.angle),apex=sub(s.p,s.a.map(x=>x*s.r/t)),ca=Math.cos(s.angle),sa=Math.sin(s.angle);
  const nat=p=>{const q=sub(p,s.p),h=dot(q,s.a),rad=sub(q,s.a.map(x=>x*h)),rho=norm(rad),r=rad.map(x=>x/rho);return r.map((x,i)=>sg*(x*ca-s.a[i]*sa));};
  const T=f.triangleIndices;const nb=new Map();for(let q=0;q<T.length;q+=3)for(let a=0;a<3;a++){const v=T[q+a];if(!nb.has(v))nb.set(v,new Set());for(let b=0;b<3;b++)if(b!==a)nb.get(v).add(T[q+b]);}
  const out=[];let nap=0;
  for(let k=0;k<f.vertexCount;k++){const p=L.vtx(f,k);if(norm(sub(p,apex))>1e-6)continue;nap++;const dn=[f.normals[3*k],f.normals[3*k+1],f.normals[3*k+2]];
    const ns=[...nb.get(k)||[]].map(v=>L.vtx(f,v)).filter(q=>norm(sub(q,apex))>1e-6);
    const angs=ns.map(q=>ang(dn,nat(q)));
    out.push({k,dist:norm(sub(p,apex)),dnLen:norm(dn),toAxis:ang(dn,s.a.map(x=>x*sg)),minAngToNeighbourNormal:Math.min(...angs),nNb:ns.length,angs:angs.map(x=>+x.toFixed(1)).join(',')});}
  console.log('face',want,'half',(deg(s.angle)).toFixed(2),'sameSense',nf.sameSense,'apex copies',nap,'|apex-p| max',Math.max(...out.map(o=>o.dist)).toExponential(1),'|n| range',Math.min(...out.map(o=>o.dnLen)).toFixed(6),Math.max(...out.map(o=>o.dnLen)).toFixed(6),
   'angle display n to neighbour-azimuth normals: min over copies',Math.min(...out.map(o=>o.minAngToNeighbourNormal)).toFixed(2),'max',Math.max(...out.map(o=>o.minAngToNeighbourNormal)).toFixed(2),'| to axis min/max',Math.min(...out.map(o=>o.toAxis)).toFixed(1),Math.max(...out.map(o=>o.toAxis)).toFixed(1));
  for(const o of out.slice(0,4))console.log('   k',o.k,'angs to each neighbour azimuth',o.angs);
 });}
