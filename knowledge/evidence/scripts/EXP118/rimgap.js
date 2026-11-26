// EXP-118: how wide is the opening along the unlabelled rim? For each rim vertex, the distance to the
// nearest triangle of every other display face (point-to-triangle), and which face that is.
// usage: node rimgap.js <part> <face>
const R='/home/user/solidworks-converters',S=require(R+'/src'),fs=require('fs');
const [file,fiS]=process.argv.slice(2),d=S.parse(fs.readFileSync(file)),fi=+fiS,f=d.faces[fi];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,s)=>a.map(x=>x*s);
function ptTri(p,a,b,c){// Ericson, closest point on triangle
  const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return add(a,mul(ab,d1/(d1-d3)));
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return add(a,mul(ac,d2/(d2-d6)));
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0)return add(b,mul(sub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));
  const den=1/(va+vb+vc);return add(a,add(mul(ab,vb*den),mul(ac,vc*den)));}
const V=(g,i)=>[0,1,2].map(k=>g.vertices[3*i+k]),key=i=>V(f,i).join(','),T=f.triangleIndices,use=new Map(),lab=new Set();
for(let t=0;t<T.length;t+=3)for(const [a,b] of [[T[t],T[t+1]],[T[t+1],T[t+2]],[T[t+2],T[t]]]){const k=[key(a),key(b)].sort().join('|');use.set(k,(use.get(k)||0)+1);}
for(const a of f.edgeAnnotations)if(a.id)lab.add([key(a.vertices[0]),key(a.vertices[1])].sort().join('|'));
const rim=[...new Set([...use].filter(([k,n])=>n===1&&!lab.has(k)).flatMap(([k])=>k.split('|')))].map(s=>s.split(',').map(Number));
const c=rim.reduce((s,p)=>add(s,p),[0,0,0]).map(x=>x/rim.length);
const others=d.faces.map((g,j)=>j).filter(j=>j!==fi&&d.faces[j].vertices.length&&(()=>{const g=d.faces[j];for(let i=0;i<g.vertices.length/3;i++)if(Math.hypot(...sub(V(g,i),c))<0.01)return true;return false;})());
const res=rim.map(p=>{let best=[Infinity,-1];for(const j of others){const g=d.faces[j],U=g.triangleIndices;for(let t=0;t<U.length;t+=3){const q=ptTri(p,V(g,U[t]),V(g,U[t+1]),V(g,U[t+2])),dd=Math.hypot(...sub(p,q));if(dd<best[0])best=[dd,j];}}return best;});
const ds=res.map(r=>r[0]).sort((a,b)=>a-b),by={};for(const r of res)by[r[1]]=(by[r[1]]||0)+1;
console.log(`face ${fi}: ${rim.length} rim vertices; distance to the nearest other display face: min ${ds[0].toExponential(2)}, median ${ds[ds.length>>1].toExponential(2)}, max ${ds[ds.length-1].toExponential(2)} m; nearest face`,JSON.stringify(by));
console.log('  under 1e-6 m:',ds.filter(x=>x<1e-6).length,' 1e-6 to 1e-4:',ds.filter(x=>x>=1e-6&&x<1e-4).length,' 1e-4 and over:',ds.filter(x=>x>=1e-4).length);
