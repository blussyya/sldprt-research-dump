'use strict';
// Step 8: the oldest legacy files (chainwheel, plate4) whose record matched none of the layouts.
// For each u32 offset +80..+160 after the bounds record start, how well does "word == 1" track mesh-flat?
// Prints offsets that agree on at least 95% of faces. Control: the same scan on SW2011 C10 (oleA) must
// find +92.
// Usage: node oldest.js > oldest.out.txt
const fs = require('fs'), path = require('path');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
for (const rel of ['test files new/SW2011/C10_cube_shell_1mm/model.SLDPRT', 'test files new/SW2011/C20_cylinders_crossed/model.SLDPRT', 'test files original/chainwheel.sldprt', 'test files original/plate4.sldprt']) {
  const R = rows.filter(r => r.file === rel), b = fs.readFileSync(path.join(L.ROOT, rel));
  const dl = sw.container.ole.displayLists(b, sw.inflateZlib).bytes, dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  const hits = [];
  for (let o = 80; o <= 160; o += 4) {
    let ag = 0, n = 0;
    for (const r of R) { if (r.at + o + 4 > dl.length || o + 4 > r.recRoom) continue; n++; if ((dv.getUint32(r.at + o, true) === 1) === (r.spreadDeg < 1e-3)) ag++; }
    if (n && ag / n >= 0.95) hits.push(`+${o}:${ag}/${n}`);
  }
  console.log(`${rel}: faces ${R.length} (flat ${R.filter(r => r.spreadDeg < 1e-3).length}), layout ${[...new Set(R.map(r => r.lay))]}, record room min ${Math.min(...R.map(r => r.recRoom))}; offsets where word==1 tracks flat >=95%: ${hits.join(' ') || 'none'}`);
}
