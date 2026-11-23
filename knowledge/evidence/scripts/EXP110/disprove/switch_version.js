'use strict';
// Step 4d: is the per-file cone switch just the DisplayLists version? For each modern file: _DL_VERSION_
// from the stream names, whether any face has a cone, and whether it has narrow (mesh cone < 40 deg)
// non-planar faces at all (a file without such faces says nothing about the switch).
// Usage: node switch_version.js > switch_version.out.txt
const fs = require('fs'), path = require('path');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => !r.ole);
for (const r of rows) if (r.spreadDeg >= 1e-3 && r.mcDeg === null) r.mcDeg = 180;
const files = [...new Set(rows.map(r => r.file))], m = {};
for (const f of files) {
  const xs = rows.filter(r => r.file === f);
  let ver = '?'; try { ver = sw.container.modern.displayListsVersion(sw.container.modern.decompressOpenSX(fs.readFileSync(path.join(L.ROOT, f)), sw.inflateRaw, sw.inflateZlib)); } catch (e) { ver = 'err'; }
  const cones = xs.some(r => r.a104 === 1 && r.a108 === 1), narrow = xs.some(r => r.spreadDeg >= 1e-3 && r.mcDeg < 40);
  const k = `DL_VERSION ${ver} | ${cones ? 'cones' : 'no cones'} | ${narrow ? 'has narrow faces' : 'no narrow faces'}`;
  m[k] = (m[k] || 0) + 1;
}
for (const k of Object.keys(m).sort()) console.log(m[k], k);
