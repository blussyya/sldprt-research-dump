'use strict';
// Step 3: where does the face record after the geometry end? For every modern face, find the first
// (8,100,2) array header after geometryEnd (the metadata's first array) and report the distance.
// The claim assumes 132. Also dumps the record words of one face per newer-layout file.
// Usage: node layout.js > layout.out.txt
const fs = require('fs');
const sw = require('/home/user/solidworks-converters/src');
const L = require('./lib');
const { files } = L.corpus();
const dist = {}, perFile = [];
for (const F of files) {
  const b = fs.readFileSync(F.path);
  if (sw.container.modern.isOLE2(b)) continue;
  let dl; try { dl = sw.container.modern.findDisplayLists(b, sw.inflateRaw, sw.inflateZlib); } catch (e) { continue; }
  if (!dl) continue;
  const d = sw.display.extractDisplayLists(dl, false);
  const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  const fd = {};
  let shown = false;
  d.faces.forEach((f, i) => {
    const end = d.faces[i + 1] ? d.faces[i + 1].offset : dl.length;
    let k = -1;
    for (let o = f.geometryEnd; o + 12 <= Math.min(end, f.geometryEnd + 4000); o++)
      if (dv.getUint32(o, true) === 8 && dv.getUint32(o + 4, true) === 100 && dv.getUint32(o + 8, true) === 2) { k = o - f.geometryEnd; break; }
    fd[k] = (fd[k] || 0) + 1; dist[k] = (dist[k] || 0) + 1;
    if (k !== 132 && !shown && k > 0) {
      shown = true;
      const words = []; for (let o = 0; o < k; o += 4) words.push(dv.getUint32(f.geometryEnd + o, true));
      console.log('  example', F.rel, 'face', i, 'k', k, 'u32 words:', words.join(' '));
    }
  });
  perFile.push([F.rel, JSON.stringify(fd)]);
}
console.log('distance geometryEnd -> first (8,100,2) header, all modern faces:', JSON.stringify(dist));
for (const [f, x] of perFile) if (x !== JSON.stringify({ 132: JSON.parse(x)[132] })) console.log(x, f);
