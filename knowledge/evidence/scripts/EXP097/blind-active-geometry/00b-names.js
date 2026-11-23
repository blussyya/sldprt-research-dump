'use strict';
const fs = require('fs'), zlib = require('zlib');
const CONV = '/home/user/solidworks-converters/src';
const modern = require(CONV + '/container/modern.js');
const MAX = 128 * 1024 * 1024;
const s = modern.decompressOpenSX(new Uint8Array(fs.readFileSync(process.argv[2])), b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), b => zlib.inflateSync(b, { maxOutputLength: MAX }));
for (const k of Object.keys(s)) console.log(String(s[k].length).padStart(9), k);
