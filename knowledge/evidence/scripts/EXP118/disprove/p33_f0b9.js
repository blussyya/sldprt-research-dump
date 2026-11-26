// f0b9a118 face 27: a cylinder face with one loop that winds about -359 degrees. Per edge: type,
// sweep, h range; then the display face with the same edge ids and its boundary.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file=process.argv[2],fid=+process.argv[3];
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nf=M.faces.find(f=>f.id===fid),s=nf.surface,y=G.cross(s.a,s.x);
const th=p=>{const q=G.sub(p,s.p);return Math.atan2(G.dot(q,y),G.dot(q,s.x))*180/Math.PI;},hh=p=>G.dot(G.sub(p,s.p),s.a)*1000;
console.log('face',fid,s.type,'r',s.r,'loops',nf.loops.length);
for(const l of nf.loops){let tot=0;for(const c of l.coedges){const e=M.edges.get(c.edge);let ps=B.branch(M,e,false);if(!c.sense)ps=ps.slice().reverse();let t=0;for(let i=1;i<ps.length;i++){let a=th(ps[i])-th(ps[i-1]);while(a>180)a-=360;while(a<-180)a+=360;t+=a;}tot+=t;
  console.log('  edge',c.edge,c.sense?'+':'-',e.curve.type,e.curve.basis?e.curve.basis.type:'','v',JSON.stringify(e.v),'sweep',t.toFixed(2),'h',Math.min(...ps.map(hh)).toFixed(3),'..',Math.max(...ps.map(hh)).toFixed(3),'other face',M.faces.filter(f=>f!==nf&&f.loops.some(q=>q.coedges.some(k=>k.edge===c.edge))).map(f=>f.id+':'+f.surface.type).join(','));}
  console.log('  loop sweep',tot.toFixed(2));}
const ids=nf.loops.flatMap(l=>l.coedges.map(c=>c.edge));
d.faces.forEach((f,i)=>{const fi=new Set(f.edgeAnnotations.map(a=>a.id).filter(x=>x));if(ids.every(x=>fi.has(x))){const {E}=L.meshEdges(f);const b=[...E].filter(([p,e])=>e.uses===1);
  console.log('display face',i,'rawId',f.metadata&&f.metadata.rawId,'tag',f.metadata&&f.metadata.typeTag,'boundary segs',b.length,'unlabelled',b.filter(([p,e])=>e.ids.every(x=>!x)).length,'cycles',f.boundaryCycles&&f.boundaryCycles.length);
  const hs=[];for(let k=0;k<f.vertexCount;k++)hs.push(hh([f.vertices[3*k],f.vertices[3*k+1],f.vertices[3*k+2]]));console.log('  mesh h',Math.min(...hs).toFixed(3),'..',Math.max(...hs).toFixed(3));}});
