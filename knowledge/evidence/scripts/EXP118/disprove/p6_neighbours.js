// For the unlabelled chain of a display face: per vertex, the nearest other display face (point to
// triangle distance), and the distance to nearby native surfaces. Tests "not shared with any other
// display face" with a distance instead of exact coordinates.
// Control: the labelled segments of the same face must find their neighbour face at ~0 distance.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file=process.argv[3]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const di=+process.argv[2]||75;
const buf=fs.readFileSync(file),d=S.parse(buf);
function ptTri(p,a,b,c){ // Ericson closest point
  const ab=G.sub(b,a),ac=G.sub(c,a),ap=G.sub(p,a),d1=G.dot(ab,ap),d2=G.dot(ac,ap);if(d1<=0&&d2<=0)return G.dist(p,a);
  const bp=G.sub(p,b),d3=G.dot(ab,bp),d4=G.dot(ac,bp);if(d3>=0&&d4<=d3)return G.dist(p,b);
  const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return G.dist(p,G.add(a,G.mul(ab,v)));}
  const cp=G.sub(p,c),d5=G.dot(ab,cp),d6=G.dot(ac,cp);if(d6>=0&&d5<=d6)return G.dist(p,c);
  const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return G.dist(p,G.add(a,G.mul(ac,w)));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return G.dist(p,G.add(b,G.mul(G.sub(c,b),w)));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return G.dist(p,G.add(a,G.add(G.mul(ab,v),G.mul(ac,w))));
}
const V=(f,i)=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]];
const f=d.faces[di];const {E}=L.meshEdges(f);
const bnd=[...E].filter(([p,e])=>e.uses===1);
const groups={unl:new Set(),lab:new Map()};
for(const [p,e] of bnd){const id=e.ids.find(x=>x)||0;for(const k of p.split('|')){if(id===0)groups.unl.add(k);else{if(!groups.lab.has(id))groups.lab.set(id,new Set());groups.lab.get(id).add(k);}}}
const lo=[0,1,2].map(k=>Math.min(...Array.from({length:f.vertexCount},(_,i)=>f.vertices[3*i+k])))
,hi=[0,1,2].map(k=>Math.max(...Array.from({length:f.vertexCount},(_,i)=>f.vertices[3*i+k])));
const pad=5e-4;
const cand=[];d.faces.forEach((g,gi)=>{if(gi===di)return;for(let t=0;t<g.triangleIndices.length;t+=3){const tr=[0,1,2].map(j=>V(g,g.triangleIndices[t+j]));
  if([0,1,2].some(k=>Math.max(...tr.map(q=>q[k]))<lo[k]-pad||Math.min(...tr.map(q=>q[k]))>hi[k]+pad))continue;cand.push({gi,tr});}});
function nearest(k){const p=L.P(k);let best={d:Infinity,gi:-1};const per=new Map();for(const c of cand){const dd=ptTri(p,...c.tr);if(dd<(per.get(c.gi)??Infinity))per.set(c.gi,dd);if(dd<best.d)best={d:dd,gi:c.gi};}return {best,per};}
function report(name,set){const ds=[],faces={};for(const k of set){const {best}=nearest(k);ds.push(best.d);faces[best.gi]=(faces[best.gi]||0)+1;}
  ds.sort((a,b)=>a-b);console.log(name,'verts',ds.length,'nearest-other-face dist: min',ds[0].toExponential(2),'median',ds[ds.length>>1].toExponential(2),'max',ds[ds.length-1].toExponential(2),'n<=1e-7',ds.filter(x=>x<=1e-7).length,'nearest faces',JSON.stringify(faces));}
console.log('face',di,'candidate triangles',cand.length);
for(const [id,s] of groups.lab)report('label '+id,s);
report('unlabelled',groups.unl);
