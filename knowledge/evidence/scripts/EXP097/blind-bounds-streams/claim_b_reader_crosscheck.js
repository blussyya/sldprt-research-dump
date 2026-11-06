// Cross-check of claim B against the package reader (src/container/modern.js decompressOpenSX).
// The reader is used only as an independent comparison. Writes claim_b_reader_crosscheck.json.
'use strict';
const fs = require('fs'), path = require('path');
const modern = require('/home/user/dump-validation/package/src/container/modern.js');
const zlib = require('zlib');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const HERE = __dirname, ROOT = '/home/user/dump-validation';
const mine = JSON.parse(fs.readFileSync(path.join(HERE, 'claim_b_results.json'), 'utf8'));
const byFile = new Map(mine.per_file.map(r => [r.file, r]));
let filesCompared = 0, agreeFiles = 0, readerNames = 0, myNames = 0, onlyReader = [], onlyMine = [], readerThrows = [];
for (const r of mine.per_file) {
  const buf = fs.readFileSync(path.join(ROOT, r.file));
  let streams;
  try { streams = modern.decompressOpenSX(new Uint8Array(buf), inflateRaw, inflateZlib); }
  catch (e) { readerThrows.push({ file: r.file, error: e.message }); continue; }
  const rNames = new Set(Object.keys(streams));
  const mNames = new Set(r.entries.filter(e => e.kind === 'nonempty').map(e => e.name));
  filesCompared++;
  readerNames += rNames.size; myNames += mNames.size;
  const a = [...rNames].filter(x => !mNames.has(x)), b = [...mNames].filter(x => !rNames.has(x));
  if (!a.length && !b.length) agreeFiles++;
  if (a.length) onlyReader.push({ file: r.file, names: a.slice(0, 5) });
  if (b.length) onlyMine.push({ file: r.file, names: b.slice(0, 5) });
}
const out = { filesCompared, agreeFiles, readerDistinctNames: readerNames, myNonemptyNames: myNames, readerThrows, onlyReader: onlyReader.slice(0, 10), onlyMine: onlyMine.slice(0, 10) };
fs.writeFileSync(path.join(HERE, 'claim_b_reader_crosscheck.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
