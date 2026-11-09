'use strict';
const C = '/home/user/conv-dev/src';
const display = require(C), native = require(C + '/brep/native'), E = require(C + '/geom/eval');
const path = '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT';
const d = display.parse(path);
const b = native.build(require(C + '/index').readBrep(path).parsed);
const nf = b.faces.find(f => f.id === 1227);
const s = nf.surface;
console.log('node1227 surface', JSON.stringify({type: s.type, a: s.a, c: s.c, profile: s.curve && s.curve.type, profileP0: s.curve && s.curve.p, sense: s.sense}).slice(0, 600));
const f291 = d.faces.find(f => f.metadata.rawId === 291);
const p = [f291.vertices[0], f291.vertices[1], f291.vertices[2]];
console.log('vertex of raw291', p, 'surfaceDistance', JSON.stringify(E.surfaceDistance(s, p)).slice(0, 300));
let zeros = 0, nans = 0; const n = f291.vertexCount;
for (let i = 0; i < n; i += 10) { const q = [f291.vertices[i*3], f291.vertices[i*3+1], f291.vertices[i*3+2]]; try { const r = E.surfaceDistance(s, q); if (r.d === 0) zeros++; if (Number.isNaN(r.d)) nans++; } catch (e) { nans += 0; } }
console.log('raw291 probes with d=0:', zeros, 'NaN:', nans, 'of', Math.ceil(n/10));
const same = b.faces.filter(f => f.id === 1227).length; console.log('native faces with id 1227:', same);
