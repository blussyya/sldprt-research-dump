// Per display face: area, centroid, worst distance to the STEP (from dist*.csv centroid rows),
// then match old faces to new ones by area and centroid.
const fs=require('fs');const E='/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP087/stlstep/';
function load(j,csv){
  const F=require(j).faces.map(f=>({...f,vertices:f.vertices.map(x=>x*1000)})),D=new Map();
  for(const l of fs.readFileSync(E+csv,'utf8').split('\n')){if(!l||l[0]==='#')continue;const r=l.split(',').map(Number);if(r[0]===1)D.set(r[1],r);}
  let t=0;return F.map((f,k)=>{const v=f.vertices,ix=f.triangleIndices;let A=0,c=[0,0,0],worst=0,chk=0;
    for(let i=0;i<ix.length;i+=3,t++){const a=ix[i]*3,b=ix[i+1]*3,d=ix[i+2]*3;
      const u=[v[b]-v[a],v[b+1]-v[a+1],v[b+2]-v[a+2]],w=[v[d]-v[a],v[d+1]-v[a+1],v[d+2]-v[a+2]];
      const cr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],ar=Math.hypot(...cr)/2;A+=ar;
      const m=[0,1,2].map(q=>(v[a+q]+v[b+q]+v[d+q])/3);for(let q=0;q<3;q++)c[q]+=m[q]*ar;
      const r=D.get(t);if(r){worst=Math.max(worst,r[5]);chk=Math.max(chk,Math.abs(r[2]-m[0]));}}
    return {k,A,c:c.map(x=>x/A),worst,chk,ntri:ix.length/3};});
}
const O=load('./old.json','dist.csv'),N=load('./new.json','dist-2026.csv');
console.log('order check (max centroid x mismatch, mm):',Math.max(...O.map(f=>f.chk)).toExponential(1),Math.max(...N.map(f=>f.chk)).toExponential(1));
const dist=(a,b)=>Math.hypot(a.c[0]-b.c[0],a.c[1]-b.c[1],a.c[2]-b.c[2]);
const used=new Set(),pairs=[];
for(const o of O){let best=null,bd=1e9;for(const n of N){const d=dist(o,n)+Math.abs(o.A-n.A)/Math.max(o.A,1e-9)*5;if(d<bd){bd=d;best=n;}}pairs.push([o,best,bd]);used.add(best.k);}
const bad=pairs.filter(p=>p[2]>0.5);
console.log('old faces with no close match in new (score>0.5):',bad.length);
for(const [o,n,s] of bad.sort((a,b)=>b[2]-a[2]).slice(0,12))console.log(' old',o.k,'A',o.A.toFixed(2),'c',o.c.map(x=>x.toFixed(2)).join(' '),'worst',o.worst.toFixed(3),'| nearest new',n.k,'A',n.A.toFixed(2),'c',n.c.map(x=>x.toFixed(2)).join(' '),'score',s.toFixed(3));
console.log('new faces matched by no old face:');for(const n of N)if(!used.has(n.k))console.log(' new',n.k,'A',n.A.toFixed(2),'c',n.c.map(x=>x.toFixed(2)).join(' '),'ntri',n.ntri);
console.log('old faces with worst>0.1:');for(const o of O)if(o.worst>0.1)console.log(' old',o.k,'A',o.A.toFixed(2),'c',o.c.map(x=>x.toFixed(2)).join(' '),'worst',o.worst.toFixed(3),'ntri',o.ntri);
