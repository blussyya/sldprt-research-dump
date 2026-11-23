'use strict';
// Step 3c: classify each modern face record by what follows it, then tabulate the claim's words
// (+92, +96, +104, +108, +128) and the next word (+132) per layout:
//   A  (8,100,2) array header at +132            (the layout the converter's metadata reader expects)
//   B  (8,100,2) array header at +140            (an extra f64 after the radius; seen in 3 files)
//   C  u32 1 at +132, then (12,100,2) at +136    (2025/2026 saves)
// Prints every C-layout face that has u104=1 and u108=1, word by word, to see where its floats sit.
// Usage: node record_len.js > record_len.out.txt
const fs = require('fs');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const { files } = L.corpus();
const stats = {}, shown = { B: 0, C: 0, A: 0 };
const add = (k, v) => { stats[k] = stats[k] || {}; stats[k][v] = (stats[k][v] || 0) + 1; };
const filesBy = {};
for (const F of files) {
  const b = fs.readFileSync(F.path);
  if (sw.container.modern.isOLE2(b)) continue;
  let dl; try { dl = sw.container.modern.findDisplayLists(b, sw.inflateRaw, sw.inflateZlib); } catch (e) { continue; }
  if (!dl) continue;
  const d = sw.display.extractDisplayLists(dl, false), dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  d.faces.forEach((f, i) => {
    const g = f.geometryEnd, end = d.faces[i + 1] ? d.faces[i + 1].offset : dl.length;
    if (g + 152 > end) { add('layout', 'short'); return; }
    const u = o => dv.getUint32(g + o, true), fl = o => dv.getFloat32(g + o, true);
    const hdr = (o, s) => u(o) === s && u(o + 4) === 100 && u(o + 8) === 2;
    const lay = hdr(132, 8) ? 'A' : hdr(140, 8) ? 'B' : (u(132) === 1 && hdr(136, 12)) ? 'C' : 'other';
    add('layout', lay); filesBy[lay] = filesBy[lay] || new Set(); filesBy[lay].add(F.rel);
    add(lay + ' u128', u(128)); add(lay + ' u132', lay === 'A' ? 'hdr' : u(132));
    add(lay + ' u104,u108', `${u(104)},${u(108)}`); add(lay + ' u96', u(96));
    if (lay === 'B') add('B u100,u104,u108,u112,u116,u136', `${u(100)},${u(104)},${u(108) > 1000 ? 'big' : u(108)},${u(112)},${u(116)},${u(136)}`);
    if (lay === 'B') { const r = dv.getFloat64(g + 84, true), x = dv.getFloat64(g + 92, true); add('B f64@92 / (2*radius@84)', (x / (2 * r)).toFixed(9)); }
    if ((lay === 'C' && u(104) === 1 && u(108) === 1 && shown.C < 6) || (lay === 'B' && u(112) === 1 && u(116) === 1 && shown.B < 3)) {
      shown[lay]++;
      const ws = []; for (let o = 88; o <= 140; o += 4) ws.push(`+${o}:${u(o)}/${fl(o).toPrecision(7)}`);
      console.log(`${lay} ${F.rel} face ${i}: ${ws.join(' ')}`);
    }
  });
}
for (const [k, v] of Object.entries(stats)) console.log(k, JSON.stringify(v));
for (const [k, s] of Object.entries(filesBy)) console.log(`files with layout ${k}: ${s.size}`);
