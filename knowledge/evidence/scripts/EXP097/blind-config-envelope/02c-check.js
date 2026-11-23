'use strict';
// Check: do the converter's face bounding records (at geometryEnd) pass the arithmetic test?
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
const p = display.parseSLDPRT(buf, inflateRaw, inflateZlib);
const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
const f64 = o => dv.getFloat64(o, true);
function test(r) {
  const min = [60, 68, 76].map(k => f64(r + k)), max = [36, 44, 52].map(k => f64(r + k));
  const c = [12, 20, 28].map(k => f64(r + k)), rad = f64(r + 84);
  if (![...min, ...max, ...c, rad].every(Number.isFinite)) return 'nonfinite';
  if (min.some((x, k) => !(x < max[k]))) return 'min>=max';
  let ok = true;
  for (let k = 0; k < 3; k++) if (Math.abs(c[k] - (min[k] + max[k]) / 2) > 1e-9 * (1 + Math.abs(c[k]))) ok = false;
  const d = Math.hypot(...max.map((x, k) => x - c[k]));
  if (Math.abs(rad - d) > 1e-9 * (1 + rad)) ok = false;
  return ok ? 'pass' : 'arith-fail';
}
const res = p.faces.map(f => [f.geometryEnd, test(f.geometryEnd), dv.getUint32(f.geometryEnd, true), dv.getUint32(f.geometryEnd + 4, true), dv.getUint32(f.geometryEnd + 8, true), f.bounds ? 'bounds-ok' : 'bounds-null']);
console.log('faces', p.faces.length, JSON.stringify(res.slice(0, 6)));
const counts = {};
for (const r of res) counts[r[1]] = (counts[r[1]] || 0) + 1;
console.log(counts);
