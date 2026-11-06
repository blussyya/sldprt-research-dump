'use strict';
// Count faces and vertices that carry the optional per-vertex float arrays (DisplayLists step 5),
// using the converter's own display parser. Output: JSON summary on stdout.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const PKG = '/home/user/dump-validation/package';
const display = require(path.join(PKG, 'src/display.js'));
const { inflateRaw, inflateZlib } = require(path.join(PKG, 'src/index.js'));
const ROOT = '/home/user/dump-validation';
const folders = ['test files original', 'test files new', 'test files online'];
const list = execFileSync('find', folders.map(f => path.join(ROOT, f)).concat(['-type', 'f', '-iname', '*.sldprt']), { encoding: 'utf8' })
  .split('\n').filter(Boolean).sort();
const files = [];
let totFaces = 0, totVerts = 0, filesWith = 0, faceCount = 0, scalarFaces = 0, scalarVerts = 0;
const perFile = [];
for (const f of list) {
  let r;
  try { r = display.parseSLDPRT(fs.readFileSync(f), inflateRaw, inflateZlib); }
  catch (e) { perFile.push({ file: path.relative(ROOT, f), error: e.message }); continue; }
  const faces = r.faces || [];
  const sf = faces.filter(x => x.metadata && x.metadata.scalarArrays && x.metadata.scalarArrays.length === 2);
  const sv = sf.reduce((s, x) => s + x.vertexCount, 0);
  if (sf.length) { filesWith++; scalarFaces += sf.length; scalarVerts += sv; }
  perFile.push({ file: path.relative(ROOT, f), format: r.format, faces: faces.length, scalarFaces: sf.length, scalarVerts: sv, legacy: r.format.startsWith('legacy') });
  totFaces += faces.length;
}
console.log(JSON.stringify({ partFiles: list.length, filesWithScalarArrays: filesWith, scalarFaces, scalarVerts, perFile }, null, 1));
