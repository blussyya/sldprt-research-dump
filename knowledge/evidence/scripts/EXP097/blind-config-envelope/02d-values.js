'use strict';
const fs = require('fs'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const MAX = 128 * 1024 * 1024;
const buf = fs.readFileSync(process.argv[2]);
const dl = modern.findDisplayLists(buf, b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), b => zlib.inflateSync(b, { maxOutputLength: MAX }));
const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
const f64 = o => dv.getFloat64(o, true);
for (const r of process.argv.slice(3).map(Number)) {
  const c = [12, 20, 28].map(k => f64(r + k)), max = [36, 44, 52].map(k => f64(r + k)), min = [60, 68, 76].map(k => f64(r + k)), rad = f64(r + 84);
  console.log(r, 'c', c.map(x => x.toPrecision(10)).join(' '), '| max', max.map(x => x.toPrecision(10)).join(' '), '| min', min.map(x => x.toPrecision(10)).join(' '), '| rad', rad.toPrecision(10), '| +0', [0, 4, 8].map(k => dv.getUint32(r + k, true)).join(','), '| +92..', dl.subarray(r + 92, r + 132).toString('hex').slice(0, 40));
}
