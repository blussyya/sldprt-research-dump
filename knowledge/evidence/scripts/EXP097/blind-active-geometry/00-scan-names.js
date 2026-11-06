'use strict';
// Scan every part file: stream names only (Config-N-Partition, Config-N-ModelHeader, Header2).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/solidworks-converters/src';
const modern = require(path.join(CONV, 'container/modern.js'));
const ole = require(path.join(CONV, 'container/ole.js'));
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const roots = process.argv.slice(2);
const list = [];
function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.sldprt$/i.test(e.name)) list.push(p); } }
roots.forEach(walk);
const rows = [];
for (const f of list) {
  const raw = new Uint8Array(fs.readFileSync(f));
  let names = [], err = null;
  try {
    if (modern.isOLE2(raw)) names = ole.read(raw).entries.map(e => e.name);
    else names = Object.keys(modern.decompressOpenSX(raw, inflateRaw, inflateZlib));
  } catch (e) { err = e.message; }
  const parts = names.filter(k => /(?:^|\/)Config-\d+-Partition$/.test(k)).map(k => +/Config-(\d+)-Partition$/.exec(k)[1]);
  const hdrs = names.filter(k => /Config-\d+-ModelHeader$/.test(k)).map(k => +/Config-(\d+)-ModelHeader$/.exec(k)[1]);
  rows.push({ file: path.relative('/home/user/dump-validation', f), legacy: modern.isOLE2(raw), partitions: parts.length, modelHeaders: hdrs.length, header2: names.some(k => /(?:^|\/)Header2$/.test(k)), err });
}
process.stdout.write(JSON.stringify(rows, null, 0) + '\n');
