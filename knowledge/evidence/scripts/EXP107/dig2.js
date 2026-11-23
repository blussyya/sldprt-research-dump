'use strict';
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const f = process.argv[2], want = process.argv.slice(3).map(Number);
const p = L.loadPart(f);
const joined = J.join(p.df, p.M);
p.df.forEach((d, i) => {
  const j = joined[i]; if (!j.face || !want.includes(d.metadata.rawId)) return;
  const nf = j.face, bnd = new Set(); for (const cy of d.boundaryCycles) for (const v of cy.vertices) bnd.add(v);
  console.log('raw', d.metadata.rawId, 'vertexCount', d.vertexCount, 'cycles', JSON.stringify(d.boundaryCycles.map(c => ({ n: c.vertices.length, ids: c.edgeIds }))));
  console.log(' annotations (id!=0 count):', d.edgeAnnotations.filter(a => a.id !== 0).length, 'total', d.edgeAnnotations.length, 'id values', [...new Set(d.edgeAnnotations.map(a => a.id))].slice(0, 12));
  for (let k = 0; k < d.vertexCount; k++) {
    const p3 = [d.vertices[3 * k], d.vertices[3 * k + 1], d.vertices[3 * k + 2]];
    const r = L.resid(nf.surface, p3);
    if (Math.abs(r) > 1e-8) {
      const ann = d.edgeAnnotations.filter(a => a.vertices.includes(k)).map(a => a.id);
      console.log('  v', k, 'resid', r.toExponential(3), 'inCycle', bnd.has(k), 'annotationIds', JSON.stringify(ann), 'p', p3.map(x => x.toFixed(6)).join(','));
    }
  }
  console.log(' native loops', nf.loops.map(l => l.coedges.length), 'surface', nf.surface.type, 'angle', nf.surface.angle, 'r', nf.surface.r);
});
