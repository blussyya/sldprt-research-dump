'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const container = require('../../v0.1/src/parser-core');
const parser = require('../src/parser-core');

const file = path.resolve(__dirname, '../../../test files new/SW2022/C00_cube_10mm/model.SLDPRT');
const original = fs.readFileSync(file);
const ir = bytes => zlib.inflateRawSync(bytes);
const iz = bytes => zlib.inflateSync(bytes);
const key = original[7];
const magic = Buffer.from([20, 0, 6, 0, 8, 0]);
const rol = (b, shift) => ((b << shift) | (b >>> (8 - shift))) & 255;
let crcOffset = -1;
for (let at = original.indexOf(magic); at !== -1; at = original.indexOf(magic, at + 1)) {
  const start = at - 4;
  if (start < 0 || start + 30 > original.length) continue;
  const n = original.readUInt32LE(start + 26);
  if (n > 1024 || start + 30 + n > original.length) continue;
  let name = '';
  for (let i = 0; i < n; i++) name += String.fromCharCode(rol(original[start + 30 + i], key));
  // The file also contains directory-like records with the same name and a
  // small non-CRC value. Target the data-stream header the reader accepts.
  if (name === 'Contents/DisplayLists' && original.readUInt32LE(start + 14) >= 65536) {
    crcOffset = start + 14;
    break;
  }
}
assert(crcOffset >= 0);
assert.equal(parser.parseSLDPRT(original, ir, iz).errors.length, 0);
const bad = Buffer.from(original);
bad.writeUInt32LE((bad.readUInt32LE(crcOffset) ^ 1) >>> 0, crcOffset);
assert.match(parser.parseSLDPRT(bad, ir, iz).errors.join(' '), /CRC-32 mismatch in stream Contents\/DisplayLists/);
assert.throws(() => container.findDisplayLists(bad, ir, iz), /CRC-32 mismatch/);
console.log('DisplayLists CRC mutation rejected; unmodified cube accepted.');
