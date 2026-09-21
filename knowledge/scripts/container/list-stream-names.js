#!/usr/bin/env node
// What are the modern container's stream names, actually?
//
// heybryan.org (pre-2015) says the geometry stream "usually has a name like
// Contents/DisplayLists__ZLB". Our own docs call it "Contents/DisplayLists".
// The literal string is absent from modern files' raw bytes -- but that is
// expected, because the container directory is itself compressed. So list the
// names AFTER decompression and see what the files really call it.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = '/home/user/sldprt-research-dump/test files original';
const core = require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.sldprt$/i.test(e.name)) files.push(p);
  }
})(ROOT);
files.sort();

const inflateRaw = b => zlib.inflateRawSync(Buffer.from(b));
const inflateZlib = b => zlib.inflateSync(Buffer.from(b));

// decompressOpenSX is internal; reach it the same way findDisplayLists does.
const fn = core.decompressOpenSX || (core.__test && core.__test.decompressOpenSX);

const allNames = new Map(); // name -> count of files containing it

for (const f of files) {
  const buf = fs.readFileSync(f);
  const rel = path.relative(ROOT, f);
  if (core.isOLE2 && core.isOLE2(buf)) { console.log(`OLE2   ${rel}  (skipped)`); continue; }
  if (!fn) { console.log('decompressOpenSX not exported; exports =', Object.keys(core)); break; }
  let streams;
  try { streams = fn(buf, inflateRaw, inflateZlib); }
  catch (e) { console.log(`ERR    ${rel}: ${e.message}`); continue; }
  const names = Object.keys(streams);
  for (const n of names) allNames.set(n, (allNames.get(n) || 0) + 1);
  const dl = names.filter(n => /displaylist/i.test(n));
  console.log(`modern ${rel}`);
  console.log(`         ${names.length} streams; displaylist-ish: ${JSON.stringify(dl)}`);
}

console.log('\n=== every stream name seen, with file count ===');
for (const [n, c] of [...allNames.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(3)}  ${n}`);
}
console.log('\n=== suffix check ===');
const zlb = [...allNames.keys()].filter(n => /__ZLB/i.test(n));
const zip = [...allNames.keys()].filter(n => /__Zip/i.test(n));
console.log(`  names containing __ZLB: ${zlb.length ? JSON.stringify(zlb) : 'NONE'}`);
console.log(`  names containing __Zip: ${zip.length ? JSON.stringify(zip) : 'NONE'}`);
