'use strict';
const C = '/home/user/conv-dev/src';
const display = require(C);
const native = require(C + '/brep/native');
const partition = require(C + '/parasolid/partition');
const fs = require('fs');
const files = {
  a4ecc6f5: '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT',
  '8cd79ff5': '/home/user/sldprt-research-dump/test files online/2019/8cd79ff5_1ESxx.SLDPRT',
  '2f121983': '/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT',
};
const which = process.argv[2] || Object.keys(files).join(',');
for (const name of which.split(',')) {
  const p = files[name];
  const d = display.parse(p);
  const tags = {};
  for (const f of d.faces) { const t = f.metadata && f.metadata.typeTag; tags[t] = (tags[t] || 0) + 1; }
  console.log(`== ${name}: display faces ${d.faces.length}, rejected ${(d.rejected||[]).length}, errors ${JSON.stringify(d.errors)}`);
  console.log('tags', JSON.stringify(tags));
  const body = require(C + '/index').readBrep(p);
  const b = native.build(body.parsed);
  const nat = new Map(b.faces.map(f => [f.id, f]));
  const byType = {};
  for (const f of b.faces) byType[f.surface.type] = (byType[f.surface.type] || 0) + 1;
  console.log('native faces', b.faces.length, 'by type', JSON.stringify(byType), 'section', body.source, body.parsed.error || '');
  const f0 = d.faces.find(f => f.metadata && f.metadata.typeTag === 4010) || d.faces[0];
  if (f0) console.log('sample 4010/first face', JSON.stringify({rawId: f0.metadata.rawId, tag: f0.metadata.typeTag, dir: f0.metadata.direction, params: f0.metadata.parameters, nverts: f0.vertexCount, v0: f0.vertices.slice(0,3)}));
  const ids = new Set(d.faces.map(f => f.metadata && f.metadata.rawId));
  console.log('rawIds joining native:', [...ids].filter(i => nat.has(i)).length, 'of', ids.size);
}
