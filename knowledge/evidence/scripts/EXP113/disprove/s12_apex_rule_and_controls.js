// (1) Control: wrong conventions must fail the non-apex normal test. (2) Apex copies: display normal vs exact normal at each adjacent generator's azimuth.
const L=require('./lib.js');const name=process.argv[2];const file=L.PARTS[name]||name;const {d,j}=L.load(file);const {sub,dot,norm}=L;const un=a=>{const n=norm(a);return a.map(x=>x/n)};const deg=x=>x*180/Math.PI;
const ang=(a,b)=>deg(Math.acos(Math.max(-1,Math.min(1,dot(un(a),un(b))))));
const V={right:(r,a,ca,sa,sg)=>r.map((x,i)=>sg*(x*ca-a[i]*sa)),axisFlipped:(r,a,ca,sa,sg)=>r.map((x,i)=>sg*(x*ca+a[i]*sa)),senseFlipped:(r,a,ca,sa,sg)=>r.map((x,i)=>-sg*(x*ca-a[i]*sa))};
const acc={};let apexFaces=0,worstApexRule=0,nApexCopies=0;const halves=new Set();
d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face||m.face.surface.type!=='cone')return;const s=m.face.surface,sg=m.face.sameSense?1:-1,ca=Math.cos(s.angle),sa=Math.sin(s.angle),t=Math.tan(s.angle);halves.add(+deg(s.angle).toFixed(1));
 const apex=sub(s.p,s.a.map(x=>x*s.r/t));
 const nat=(p,v)=>{const q=sub(p,s.p),h=dot(q,s.a),rad=sub(q,s.a.map(x=>x*h)),rho=norm(rad);return V[v](rad.map(x=>x/rho),s.a,ca,sa,sg)};
 const T=f.triangleIndices,nb=new Map();for(let q=0;q<T.length;q+=3)for(let a=0;a<3;a++){const v=T[q+a];if(!nb.has(v))nb.set(v,new Set());for(let b=0;b<3;b++)if(b!==a)nb.get(v).add(T[q+b]);}
 let anyApex=false;
 for(let k=0;k<f.vertexCount;k++){const p=L.vtx(f,k),dn=[f.normals[3*k],f.normals[3*k+1],f.normals[3*k+2]];
  if(norm(sub(p,apex))<1e-6){anyApex=true;nApexCopies++;const ns=[...nb.get(k)||[]].map(v=>L.vtx(f,v)).filter(q=>norm(sub(q,apex))>1e-6);
   if(ns.length){const mn=Math.min(...ns.map(q=>ang(dn,nat(q,'right'))));worstApexRule=Math.max(worstApexRule,mn);}else worstApexRule=Math.max(worstApexRule,999);continue;}
  for(const v in V){const a=ang(dn,nat(p,v));const r=(acc[v]=acc[v]||{max:0,min:999,n:0});r.max=Math.max(r.max,a);r.min=Math.min(r.min,a);r.n++;}}
 if(anyApex)apexFaces++;});
console.log(name,'cone half-angles(deg)',[...halves].join(','),'| non-apex vertex normal angle to exact, by convention (n, min, max deg):');
for(const v in acc)console.log('  ',v,acc[v].n,acc[v].min.toExponential(2),acc[v].max.toExponential(2));
console.log('  apex faces',apexFaces,'apex copies',nApexCopies,'worst (over copies) of min angle to the normal at an adjacent generator azimuth:',worstApexRule.toExponential(2),'deg (999 = a copy with no non-apex neighbour)');
