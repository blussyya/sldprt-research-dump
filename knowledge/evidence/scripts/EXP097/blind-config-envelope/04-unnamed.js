'use strict';
// For every blind candidate with no MFC-wide name, dump the bytes before it and look for any
// text (ASCII, UTF-16LE, MFC wide prefix) in a 400-byte window.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const MAX = 128 * 1024 * 1024;
const R = require('./scan.json');
const ROOT = '/home/user/dump-validation';
const out = [];
for (const r of R) {
  for (const c of r.candidates) {
    if (c.names.some(n => n.gapEndToRecord === -8 && n.printable)) continue;
    const buf = fs.readFileSync(path.join(ROOT, r.file));
    const dl = modern.findDisplayLists(buf, b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), b => zlib.inflateSync(b, { maxOutputLength: MAX }));
    const w = dl.subarray(Math.max(0, c.offset - 400), c.offset);
    const u16 = w.toString('utf16le').replace(/[^\x20-\x7e -￿]/g, '.');
    const ascii = w.toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    const mfc = []; for (let s = 0; s + 4 <= w.length; s++) if (w[s] === 0xff && w[s + 1] === 0xfe && w[s + 2] === 0xff) mfc.push([w.length - s, w[s + 3]]);
    out.push({ file: r.file, offset: c.offset, dlVersion: r.dlVersion, faces: r.faces, cfg: r.configIds, lb: r.hasLocalBodies, containedInFaceUnion: c.contained, enclosesUnion: c.enclosesUnion, diff: c.maxDiffToFaceUnion_m, mfcMarkersBefore400: mfc, asciiTail: ascii.slice(-120), utf16Tail: u16.slice(-60) });
  }
}
console.log(JSON.stringify(out, null, 1));
