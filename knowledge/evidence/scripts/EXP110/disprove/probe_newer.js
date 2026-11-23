'use strict';
// Step 3b: print the u32 words after the geometry of the first faces in files where no (8,100,2)
// header follows (2025/2026 saves), to see how long the bounds record is there.
// Usage: node probe_newer.js <file> [nFaces] [nWords]
const fs = require('fs');
const sw = require('/home/user/solidworks-converters/src');
const b = fs.readFileSync(process.argv[2]), nF = +(process.argv[3] || 3), nW = +(process.argv[4] || 60);
const dl = sw.container.modern.findDisplayLists(b, sw.inflateRaw, sw.inflateZlib);
const d = sw.display.extractDisplayLists(dl, false);
const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
for (const [i, f] of d.faces.slice(0, nF).entries()) {
  const end = d.faces[i + 1] ? d.faces[i + 1].offset : dl.length;
  console.log(`face ${i} geometryEnd ${f.geometryEnd} next face at +${end - f.geometryEnd}`);
  const ws = []; for (let o = 0; o < nW * 4 && f.geometryEnd + o + 4 <= end; o += 4) ws.push(`+${o}:${dv.getUint32(f.geometryEnd + o, true)}`);
  console.log('  ' + ws.join(' '));
}
