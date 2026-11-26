// Winding of each native loop of a bore face about the cylinder axis, from the edges' own branches
// (reader sense), and of each display boundary cycle of the matching display face.
// Control: a ring loop must give +-360, and a loop that bounds a patch 0.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
const nfid=+(process.argv[2]||2516),di=+(process.argv[3]||75);
const nf=M.faces.find(f=>f.id===nfid),cyl=nf.surface,y=G.cross(cyl.a,cyl.x);
const th=p=>{const q=G.sub(p,cyl.p);return Math.atan2(G.dot(q,y),G.dot(q,cyl.x))*180/Math.PI;},hh=p=>G.dot(G.sub(p,cyl.p),cyl.a)*1000;
const sweep=ps=>{let t=0;for(let i=1;i<ps.length;i++){let a=th(ps[i])-th(ps[i-1]);while(a>180)a-=360;while(a<-180)a+=360;t+=a;}return t;};
for(const l of nf.loops){let tot=0;const parts=[];for(const c of l.coedges){const e=M.edges.get(c.edge);let ps=B.branch(M,e,false);if(!c.sense)ps=ps.slice().reverse();const s=sweep(ps);tot+=s;
  parts.push(c.edge+(c.sense?'+':'-')+' '+e.curve.type+' sweep '+s.toFixed(2)+' h '+Math.min(...ps.map(hh)).toFixed(3)+'..'+Math.max(...ps.map(hh)).toFixed(3));}
  console.log('native',nfid,'loop winding',tot.toFixed(2),'deg :',parts.join(' ; '));}
// all native faces on the same cylinder surface (same axis, radius)
const same=M.faces.filter(f=>f.surface.type==='cylinder'&&Math.abs(f.surface.r-cyl.r)<1e-12&&G.norm(G.cross(f.surface.a,cyl.a))<1e-9&&G.norm(G.cross(G.sub(f.surface.p,cyl.p),cyl.a))<1e-9);
for(const f of same){const hs=f.loops.flatMap(l=>l.coedges.flatMap(c=>(B.branch(M,M.edges.get(c.edge),false)||[]).map(hh)));console.log('coaxial same-radius face',f.id,'loops',f.loops.map(l=>l.coedges.map(c=>c.edge).join('+')).join(' | '),'h',Math.min(...hs).toFixed(3),'..',Math.max(...hs).toFixed(3));}
const f=d.faces[di];for(const c of f.boundaryCycles){const ps=c.vertices.map(i=>[f.vertices[3*i],f.vertices[3*i+1],f.vertices[3*i+2]]);ps.push(ps[0]);console.log('display',di,'cycle ids',[...new Set(c.edgeIds)].join('+'),'winding',sweep(ps).toFixed(2));}
