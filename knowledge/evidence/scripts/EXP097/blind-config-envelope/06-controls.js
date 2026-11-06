'use strict';
// Controls.
// C1 face boxes as negative control for the name rule: the converter's face bounding records are
//    known not to be configuration records. How many have an MFC name ending at r+8?
// C2 shifted-gap null for the name rule: for every arithmetic-pass box (faces and candidates),
//    count printable MFC names whose end sits at r+8+d for shifts d != 0. Compared with d = 0.
// C3 random-byte null for the arithmetic test: same-length random buffers, seeded PRNG.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const display = require(CONV + '/display');
const { boxAt, arithmeticOK } = require('./boxtest');
const MAX = 128 * 1024 * 1024;
const inf = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), infz = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const inv = require('./inventory.json');
const ROOT = '/home/user/dump-validation';

function nameEndsAt(dl, e) {
  // a printable MFC wide name whose last code unit ends at byte e (exclusive)
  for (let n = 1; n <= 127; n++) {
    const s = e - 4 - 2 * n;
    if (s < 0) break;
    if (dl[s] !== 0xff || dl[s + 1] !== 0xfe || dl[s + 2] !== 0xff || dl[s + 3] !== n) continue;
    const text = dl.subarray(s + 4, e).toString('utf16le');
    if (/^[\x20-\x7e -￿]+$/.test(text) && !text.includes('�')) return text;
  }
  return null;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const C1 = { faceBoxes: 0, faceWithNameAt8: 0, faceNameSamples: [] };
const C2 = { boxes: 0, nameAt0: 0, nameAtShift: 0, shiftsTried: 0 };
const C3 = { files: 0, randomArithmeticHits: 0, bytesTested: 0 };
const SHIFTS = [];
for (let d = -64; d <= 64; d++) if (d !== 0) SHIFTS.push(d);

for (const row of inv) {
  if (row.ole2 || !row.dlStreamNames || !row.dlStreamNames.length) continue;
  const buf = fs.readFileSync(path.join(ROOT, row.file));
  const dl = modern.findDisplayLists(buf, inf, infz);
  const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
  const p = display.parseSLDPRT(buf, inf, infz);
  // C1
  for (const f of p.faces) {
    C1.faceBoxes++;
    const t = nameEndsAt(dl, f.geometryEnd + 8);
    if (t) { C1.faceWithNameAt8++; if (C1.faceNameSamples.length < 5) C1.faceNameSamples.push([row.file, f.geometryEnd, t]); }
  }
  // C2: all arithmetic-pass boxes in the stream (faces and non-faces)
  const faceSet = new Set(p.faces.map(f => f.geometryEnd));
  for (let r = 0; r + 132 <= dl.length; r++) {
    if (!arithmeticOK(boxAt(dv, r))) continue;
    C2.boxes++;
    if (nameEndsAt(dl, r + 8)) C2.nameAt0++;
    for (const d of SHIFTS) { C2.shiftsTried++; if (nameEndsAt(dl, r + 8 + d)) C2.nameAtShift++; }
  }
  // C3: random buffer of the same length
  const rnd = rng(row.bytes + 7);
  const rb = Buffer.alloc(dl.length);
  for (let i = 0; i < rb.length; i++) rb[i] = (rnd() * 256) | 0;
  const rdv = new DataView(rb.buffer, rb.byteOffset, rb.byteLength);
  let hits = 0; for (let r = 0; r + 132 <= rb.length; r++) if (arithmeticOK(boxAt(rdv, r))) hits++;
  C3.files++; C3.randomArithmeticHits += hits; C3.bytesTested += rb.length;
}
C2.rateAt0 = C2.nameAt0 / C2.boxes;
C2.ratePerShift = C2.nameAtShift / C2.shiftsTried;
const out = { C1, C2, C3 };
fs.writeFileSync(path.join(__dirname, 'controls.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
