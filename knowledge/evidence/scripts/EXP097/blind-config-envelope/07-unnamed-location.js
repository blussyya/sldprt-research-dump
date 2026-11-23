'use strict';
// For each unnamed (no name at r+8) arithmetic box, locate it relative to the converter's face
// records: the nearest face bounding record before it, the distance, and whether it falls inside
// a face's geometry span. Also check the known layout: the modern surface record follows the box.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const display = require(CONV + '/display');
const { boxAt, arithmeticOK } = require('./boxtest');
const MAX = 128 * 1024 * 1024;
const inf = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), infz = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const R = require('./scan.json');
const ROOT = '/home/user/dump-validation';
const out = [];
for (const r of R) {
  const unnamed = r.candidates.filter(c => !c.names.some(n => n.gapEndToRecord === -8 && n.printable));
  if (!unnamed.length) continue;
  const buf = fs.readFileSync(path.join(ROOT, r.file));
  const dl = modern.findDisplayLists(buf, inf, infz);
  const p = display.parseSLDPRT(buf, inf, infz);
  const faces = p.faces.map(f => f.geometryEnd).sort((a, b) => a - b);
  for (const c of unnamed) {
    const before = faces.filter(x => x < c.offset);
    const prev = before.length ? before[before.length - 1] : null;
    const after = faces.filter(x => x > c.offset);
    const next = after.length ? after[0] : null;
    out.push({ file: r.file.split('/').pop(), offset: c.offset, faces: r.faces, dlLength: dl.length,
      prevFaceBoundsAt: prev, distFromPrevFace: prev === null ? null : c.offset - prev,
      nextFaceBoundsAt: next, distToNextFace: next === null ? null : next - c.offset,
      tailAfterDL: dl.length - c.offset });
  }
}
console.log(JSON.stringify(out, null, 1));
