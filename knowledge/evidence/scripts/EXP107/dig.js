'use strict';
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const f = process.argv[2];
const p = L.loadPart(f);
const joined = J.join(p.df, p.M);
const rows = {};
p.df.forEach((d, i) => {
  const j = joined[i]; if (!j.face) return;
  const r = L.verdict(p.M, d, j.face);
  const key = `${r.v} edge=${r.edge.res} surfType=${r.surf.type} checked=${r.surf.checked} reason=${r.surf.reason}`;
  rows[key] = (rows[key] || 0) + 1;
  if (r.v === 'wrong' && Object.keys(rows).length < 40 && (rows[key] <= 2)) {
    console.log('WRONG', 'raw', d.metadata.rawId, 'typeTag', d.metadata.typeTag, 'nat', j.face.id, j.face.surface.type, j.how,
      'edge', JSON.stringify(r.edge), 'surf', JSON.stringify({ ...r.surf, max: r.surf.max }), 'bounds', !!d.bounds, 'nBoundaryCycles', d.boundaryCycles && d.boundaryCycles.length);
  }
});
console.log(rows);
