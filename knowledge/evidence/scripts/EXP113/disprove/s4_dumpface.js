// dump one display face's boundary cycles: per vertex residual to own surface, distance to its annotated edge curve, chord dist
const L=require('./lib.js');const [,,name,disp]=process.argv;const {d,N,j,edgeByDisp}=L.load(L.PARTS[name]||name);
d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face||m.face.displayId!=+disp)return;const s=m.face.surface;
 console.log('fi',fi,s.type,'r',s.r,'angle',s.angle,'how',m.how,'verts',f.vertexCount,'cycles',f.boundaryCycles.length);
 for(const cy of f.boundaryCycles){const n=cy.vertices.length;console.log('cycle len',n);
  for(let i=0;i<n;i++){const k=cy.vertices[i],p=L.vtx(f,k),a=L.vtx(f,cy.vertices[(i+n-1)%n]),b=L.vtx(f,cy.vertices[(i+1)%n]);
   const ids=[cy.edgeIds[(i+n-1)%n],cy.edgeIds[i]];const es=ids.flatMap(id=>edgeByDisp.get(id)||[]);
   const dc=es.map(e=>L.curveDist(e,p));
   console.log(i,k,'ids',ids.join(','),'res',L.DJ.residual(s,p).toExponential(2),'chord',L.segDist(p,a,b).d.toExponential(1),'dCurve',dc.map(x=>x===null?'null':x.toExponential(1)).join(','),'ctype',es.map(e=>e.curve.type+(e.tolerant?'~':'')+':tol'+e.tolerance).join(','),'xyz',p.map(x=>x.toFixed(7)).join(' '));}}
});
