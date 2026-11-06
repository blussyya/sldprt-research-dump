'use strict';
// Blind pass over every modern file whose DisplayLists stream is readable.
// 1. Every offset of the DisplayLists stream is tested with the arithmetic box test (boxtest.js).
// 2. Hits at the converter's face bounding-record offsets (geometryEnd) are face records.
// 3. Remaining hits are config-level candidates. For each, the name rule and the
//    MFC wide-string pattern (ff fe ff, u8 count, UTF-16LE) are measured, without using the
//    claim's gap as a filter. Results go to scan.json.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const display = require(CONV + '/display');
const { boxAt, arithmeticOK } = require('./boxtest');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const inv = require('./inventory.json');
const ROOT = '/home/user/dump-validation';

// MFC wide CString: ff fe ff, u8 count, count UTF-16LE code units. Returns candidate names
// that end within [lo, hi] of position r.
function namesNear(dl, r, lo, hi) {
  const out = [];
  for (let s = Math.max(0, r - 300); s + 4 <= r + 16; s++) {
    if (dl[s] !== 0xff || dl[s + 1] !== 0xfe || dl[s + 2] !== 0xff) continue;
    const n = dl[s + 3];
    const end = s + 4 + 2 * n;
    if (n === 0 || end > dl.length) continue;
    const text = dl.subarray(s + 4, end).toString('utf16le');
    const printable = /^[\x20-\x7e -￿]+$/.test(text) && !/[�]/.test(text);
    if (end >= r - 40 && end <= r + 24) out.push({ start: s, end, gapEndToRecord: r - end, text, printable });
  }
  return out;
}

const results = [];
for (const row of inv) {
  if (row.ole2 || !row.dlStreamNames || !row.dlStreamNames.length) continue;
  const file = path.join(ROOT, row.file);
  const buf = fs.readFileSync(file);
  const dl = modern.findDisplayLists(buf, inflateRaw, inflateZlib);
  const p = display.parseSLDPRT(buf, inflateRaw, inflateZlib);
  const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  const faceOffsets = new Set(p.faces.map(f => f.geometryEnd));
  // Union of face boxes, from the converter's bounds (independent of the scan).
  let union = null;
  for (const f of p.faces) if (f.bounds) {
    if (!union) union = { min: [...f.bounds.min], max: [...f.bounds.max] };
    else for (let k = 0; k < 3; k++) { union.min[k] = Math.min(union.min[k], f.bounds.min[k]); union.max[k] = Math.max(union.max[k], f.bounds.max[k]); }
  }
  const scanHits = [];
  for (let r = 0; r + 132 <= dl.length; r++) if (arithmeticOK(boxAt(dv, r))) scanHits.push(r);
  const faceHits = scanHits.filter(r => faceOffsets.has(r));
  const unexplainedFaceOffsets = [...faceOffsets].filter(r => !scanHits.includes(r));
  const cands = scanHits.filter(r => !faceOffsets.has(r)).map(r => {
    const b = boxAt(dv, r);
    const nm = namesNear(dl, r);
    const diffToUnion = union ? Math.max(...[0, 1, 2].map(k => Math.max(Math.abs(b.min[k] - union.min[k]), Math.abs(b.max[k] - union.max[k])))) : null;
    return { offset: r, min: b.min, max: b.max, plus0: [0, 4, 8].map(k => dv.getUint32(r + k, true)), names: nm, maxDiffToFaceUnion_m: diffToUnion,
      contained: union ? [0, 1, 2].every(k => b.min[k] >= union.min[k] - 1e-9 && b.max[k] <= union.max[k] + 1e-9) : null,
      enclosesUnion: union ? [0, 1, 2].every(k => b.min[k] <= union.min[k] + 1e-9 && b.max[k] >= union.max[k] - 1e-9) : null };
  });
  results.push({ file: row.file, folder: row.folder, dlVersion: row.dlVersion, configIds: row.configIds, hasLocalBodies: row.hasLocalBodies,
    dlLength: dl.length, faces: p.faces.length, rejectedFaces: p.rejected.length, faceBoxHits: faceHits.length, unexplainedFaceOffsets,
    union, candidates: cands });
}
fs.writeFileSync(path.join(__dirname, 'scan.json'), JSON.stringify(results));
console.log('files scanned', results.length);
