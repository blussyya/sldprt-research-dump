'use strict';
const L = require('./lib.js');
const file = process.argv[2];
const f = L.loadFile(file);
for (const c of f.configs) {
  const a = L.assemble(f.all, c.name);
  if (a.error) { console.log(c.N, 'ERR', a.error); continue; }
  const P = a.parsed;
  const N = L.nativeModel.build(P);
  const usedV = new Set();
  for (const E of N.edges.values()) if (E.v) for (const x of E.v) if (x != null) usedV.add(x);
  const orphans = [...N.vertices.values()].filter(v => !usedV.has(v.id));
  const byIdx = new Map(P.nodes.map(n => [n.index, n]));
  const ownerTypes = orphans.map(v => { const n = P.nodes.find(q => q.type === 18 && q.values.node_id === v.id); const o = n && byIdx.get(n.values.owner); return o ? { ownerType: o.type, bodyType: o.values.body_type } : null; });
  const bodies = P.nodes.filter(n => n.type === 12).map(n => n.values.body_type);
  console.log(String(c.N).padStart(4), 'faces', N.faces.length, 'vertices', N.vertices.size, 'edges', N.edges.size, 'orphanVerts', orphans.length, JSON.stringify(orphans.slice(0, 2).map(v => v.p.map(x => +x.toFixed(4)))), 'owners', JSON.stringify(ownerTypes.slice(0, 2)), 'bodyTypes', JSON.stringify(bodies));
}
