// Shape of display face 75 (or another) in the bore's (theta, h): the unlabelled chain in walk
// order, and for each labelled id which side its triangles are on (h of the triangle's third vertex
// relative to the segment).
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nfid=+process.argv[2]||2516,di=+process.argv[3]||75;
const cyl=M.faces.find(f=>f.id===nfid).surface,y=G.cross(cyl.a,cyl.x);
const cc=p=>{const q=G.sub(p,cyl.p);return {th:Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI,h:G.dot(q,cyl.a)*1000,dr:(Math.hypot(G.dot(q,cyl.x),G.dot(q,y))-cyl.r)*1e6};};
const f=d.faces[di];const {E,tris}=L.meshEdges(f);const key=i=>L.vkey(f,i);
const bnd=[...E].filter(([p,e])=>e.uses===1);
// side test
const side={};
for(const [a,b,c] of tris){const k=[key(a),key(b),key(c)];for(let j=0;j<3;j++){const p=L.pk(k[j],k[(j+1)%3]),e=E.get(p);if(!e||e.uses!==1)continue;const id=e.ids.find(x=>x)||0;
  const m=cc(G.mul(G.add(L.P(k[j]),L.P(k[(j+1)%3])),0.5)),o=cc(L.P(k[(j+2)%3]));(side[id]=side[id]||{above:0,below:0});if(o.h>m.h)side[id].above++;else side[id].below++;}}
console.log('third-vertex side of boundary segments (above = toward larger h):',JSON.stringify(side));
// unlabelled chain in order
const adj=new Map();for(const [p,e] of bnd){if(e.ids.some(x=>x))continue;const [a,b]=p.split('|');for(const [x,z] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(z);}}
let s=[...adj.keys()].sort((a,b)=>cc(L.P(a)).th-cc(L.P(b)).th)[0],prev=null,cur=s;const out=[];
do{const o=cc(L.P(cur));out.push(o.th.toFixed(1)+'/'+o.h.toFixed(3)+'/'+o.dr.toFixed(0));const nx=adj.get(cur).find(z=>z!==prev);prev=cur;cur=nx;}while(cur!==s);
console.log('unlabelled chain th/h(mm)/dr(um):',out.join(' '));
