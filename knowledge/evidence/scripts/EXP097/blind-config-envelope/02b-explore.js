'use strict';
// Exploration: stricter blind box scan (positive extents, magnitude bound), then bytes before hits.
const fs = require('fs'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const display = require(CONV + '/display');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const file = process.argv[2];
const buf = fs.readFileSync(file);
const dl = modern.findDisplayLists(buf, inflateRaw, inflateZlib);
const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
const f64 = o => dv.getFloat64(o, true);
const hits = [];
for (let r = 0; r + 132 <= dl.length; r++) {
  const min = [60, 68, 76].map(k => f64(r + k)), max = [36, 44, 52].map(k => f64(r + k));
  const c = [12, 20, 28].map(k => f64(r + k)), rad = f64(r + 84);
  if (![...min, ...max, ...c, rad].every(Number.isFinite)) continue;
  if (min.some((x, k) => !(x < max[k]))) continue;
  if (max.concat(min).some(x => Math.abs(x) > 1e4)) continue;
  let ok = true;
  for (let k = 0; k < 3; k++) if (Math.abs(c[k] - (min[k] + max[k]) / 2) > 1e-9 * (1 + Math.abs(c[k]))) ok = false;
  const d = Math.hypot(...max.map((x, k) => x - c[k]));
  if (Math.abs(rad - d) > 1e-9 * (1 + rad)) ok = false;
  if (ok) hits.push(r);
}
console.log('hits', hits.length, 'of which +0 is 0,0,1:', hits.filter(r => dv.getUint32(r, true) === 0 && dv.getUint32(r + 4, true) === 0 && dv.getUint32(r + 8, true) === 1).length);
for (const r of hits.slice(0, 12)) {
  console.log('--- hit', r, 'rec+0', dl.subarray(r, r + 12).toString('hex'));
  console.log('    before 48 hex', dl.subarray(Math.max(0, r - 48), r).toString('hex'));
  console.log('    before utf16', JSON.stringify(dl.subarray(Math.max(0, r - 48), r).toString('utf16le')));
}
