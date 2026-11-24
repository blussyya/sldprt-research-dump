'use strict';
/* Look at one edge of one face: every display vertex on that edge's boundary run, with distance to
 * the surface, to the chord of its neighbours, to the edge curve and to each fin's curve image.
 * usage: node offchord.js file faceId edgeId */
const L=require('./lib');
const [file,faceId,edgeId]=[process.argv[2],+process.argv[3],+process.argv[4]];
const W=L.load(file);
const f=W.M.faces.find(x=>x.id===faceId);
const cands=[];
for(const l of f.loops)for(const c of l.coedges){const e=W.M.edges.get(c.edge);if(e.displayId!==edgeId)continue;
  console.log('edge',e.id,'tolerance',e.tolerance,'tolerant',e.tolerant,'curve',e.curve.type,'verts',e.v&&e.v.map(v=>W.M.vertices.get(v).tolerance));
  if(!e.tolerant)cands.push({name:'edge:'+e.curve.type,f:L.curveFn(e.curve)});
  for(const pc of e.pcurves){const fa=W.M.faces.find(x=>x.id===pc.face);let g=null;try{g=L.curveFn(pc.curve);}catch(x){}cands.push({name:'fin@'+pc.face+':'+(fa&&fa.surface.type),f:g});}}
W.df.forEach((df,k)=>{const m=W.j[k];if(!m.face||m.face.id!==faceId)return;
  const V=df.vertices,P=v=>[V[3*v],V[3*v+1],V[3*v+2]];
  for(const cy of df.boundaryCycles){const n=cy.vertices.length;
    for(let i=0;i<n;i++){if(cy.edgeIds[i]!==edgeId||cy.edgeIds[(i-1+n)%n]!==edgeId)continue;
      const v=cy.vertices[i],a=cy.vertices[(i-1+n)%n],b=cy.vertices[(i+1)%n];
      const p=P(v),Q=Math.max(...[p,P(a),P(b)].flat().map(L.ulp32));
      console.log('v',v,'dSurf',L.surfDist(m.face.surface,p).toExponential(2),'dChord',L.segDist(p,P(a),P(b)).toExponential(2),'|ab|',L.dist(P(a),P(b)).toExponential(2),'Q',Q.toExponential(1),
        cands.map(c=>c.name+'='+(c.f?L.curveDist(c.f,p).toExponential(2):'n/a')).join(' '),
        'nbr dSurf',L.surfDist(m.face.surface,P(a)).toExponential(1),L.surfDist(m.face.surface,P(b)).toExponential(1));}}
});
