'use strict';
// Count probes where the native spun/offset evaluator returns exactly d = 0 with a zero normal, per part,
// for display faces joined by rawId. Exact zeros on a real fit are rare; here they flag degenerate surfaces.
const C = '/home/user/conv-dev/src';
const display = require(C), native = require(C + '/brep/native'), E = require(C + '/geom/eval');
const files = {a4ecc6f5: '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT',
  '8cd79ff5': '/home/user/sldprt-research-dump/test files online/2019/8cd79ff5_1ESxx.SLDPRT'};
for (const [name, path] of Object.entries(files)) {
  const d = display.parse(path), b = native.build(require(C + '/index').readBrep(path).parsed);
  const byId = new Map(); for (const nf of b.faces) byId.set(nf.id, nf);
  const res = {spunJoinedFaces: 0, faceWithAnyExactZero: 0, faceAllZero: 0, rawId1227Tag: null};
  for (const f of d.faces) {
    if (f.metadata.rawId === 1227) res.rawId1227Tag = f.metadata.typeTag;
    const nf = byId.get(f.metadata.rawId); if (!nf || nf.surface.type !== 'spun' || f.metadata.typeTag !== 4010) continue;
    res.spunJoinedFaces++;
    let z = 0, t = 0; const n = f.vertexCount, st = Math.max(1, Math.floor(n/40));
    for (let i = 0; i < n; i += st) { t++; try { if (E.surfaceDistance(nf.surface, [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]]).d === 0) z++; } catch (e) {} }
    if (z > 0) res.faceWithAnyExactZero++; if (z === t) res.faceAllZero++;
  }
  console.log(name, JSON.stringify(res));
}
