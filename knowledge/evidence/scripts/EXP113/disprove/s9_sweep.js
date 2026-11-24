// sweep one file: cylinder/cone vertices >1e-7 off the surface; split chord (<=1e-7 from the chord of its cycle neighbours) / off-chord; for off-chord report distance to own-face edge curves (no intersection resolve)
const L=require('./lib.js');const file=process.argv[2];
let o;try{o=L.load(file);}catch(e){console.log(JSON.stringify({file:L.path.basename(file),err:e.message.slice(0,80)}));process.exit(0);}
const {d,N,j,edgeByDisp}=o;const R={file:L.path.basename(file),off:0,chord:0,offchord:0,noCycle:0,oc:[]};
d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face||m.how==='ambiguous')return;const nf=m.face,s=nf.surface;if(s.type!=='cylinder'&&s.type!=='cone')return;
 const adj=new Map();for(const cy of f.boundaryCycles||[]){const n=cy.vertices.length;cy.vertices.forEach((v,i)=>adj.set(L.vtx(f,v).join(','),{a:cy.vertices[(i+n-1)%n],b:cy.vertices[(i+1)%n],ids:[cy.edgeIds[(i+n-1)%n],cy.edgeIds[i]]}));}
 const loopEdges=[...new Set(nf.loops.flatMap(l=>l.coedges.map(c=>c.edge)))].map(id=>N.edges.get(id)).filter(Boolean);
 for(let k=0;k<f.vertexCount;k++){const p=L.vtx(f,k),r=L.DJ.residual(s,p);if(!(Math.abs(r)>1e-7))continue;R.off++;
  const a=adj.get(p.join(','));if(!a){R.noCycle++;continue;}
  const c=L.segDist(p,L.vtx(f,a.a),L.vtx(f,a.b)).d;
  if(c<=1e-7){R.chord++;continue;}
  R.offchord++;const ds=loopEdges.map(e=>[L.curveDist(e,p),e]).filter(x=>x[0]!==null).sort((x,y)=>x[0]-y[0])[0];
  R.oc.push({face:nf.displayId,k,how:m.how,res:+r.toExponential(2),chord:+c.toExponential(1),dCurve:ds?+ds[0].toExponential(1):null,ctype:ds?ds[1].curve.type+(ds[1].tolerant?'~':''):null,etol:ds?ds[1].tolerance:null});}
});
console.log(JSON.stringify(R));
