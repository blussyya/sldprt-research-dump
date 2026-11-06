'use strict';
const fs = require('fs'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const display = require(CONV + '/display');
const { boxAt, arithmeticOK } = require('./boxtest');
const MAX = 128 * 1024 * 1024;
const buf = fs.readFileSync(process.argv[2]);
const inf = [b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), b => zlib.inflateSync(b, { maxOutputLength: MAX })];
const dl = modern.findDisplayLists(buf, inf[0], inf[1]);
const p = display.parseSLDPRT(buf, inf[0], inf[1]);
const dv = new DataView(dl.buffer, dl.byteOffset, dl.byteLength);
const faceSet = new Set(p.faces.map(f => f.geometryEnd));
for (let r = 0; r + 132 <= dl.length; r++) if (arithmeticOK(boxAt(dv, r)) && !faceSet.has(r)) {
  console.log('candidate at', r, 'DL length', dl.length, 'face count', p.faces.length, 'face geometryEnd list', [...faceSet].join(','));
  console.log('before 64 hex:', dl.subarray(r - 64, r).toString('hex'));
  console.log('before utf16le:', JSON.stringify(dl.subarray(r - 64, r).toString('utf16le')));
  console.log('record first 16 hex:', dl.subarray(r, r + 16).toString('hex'));
  console.log('after 132 hex (16):', dl.subarray(r + 132, r + 148).toString('hex'));
}
