#!/usr/bin/env node
// Verify two externally-sourced claims against our own corpus.
//
//   CLAIM-1 (SolidWorks forum thread 225032, relayed via PRONOM research):
//     modern files carry 00 00 00 04 at bytes 4..7, and the sequence
//     34 f6 e6 47 56 e6 47 37 f2 appears "in every sample".
//
//   CLAIM-2 (heybryan.org, pre-2015):
//     the geometry stream "usually has a name like Contents/DisplayLists__ZLB".
//     Our parser looks for Contents/DisplayLists with no __ZLB suffix, so the
//     suffix is either legacy-only or was never literal.
//
// Neither claim is ours; both are cheap to falsify, so falsify them here.

const fs = require('fs');
const path = require('path');

const ROOT = '/home/user/sldprt-research-dump/test files original';

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.sldprt$/i.test(e.name)) files.push(p);
  }
})(ROOT);
files.sort();

const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const MARK = Buffer.from([0x34, 0xf6, 0xe6, 0x47, 0x56, 0xe6, 0x47, 0x37, 0xf2]);

// Stream names sit in the OLE2 directory / the modern container as UTF-16LE.
const u16 = s => Buffer.from(s, 'utf16le');
const NAMES = ['DisplayLists__ZLB', 'DisplayLists', 'PreviewPNG'];

const rows = [];
for (const f of files) {
  const b = fs.readFileSync(f);
  const legacy = b.slice(0, 8).equals(OLE2);
  const head4 = b.slice(4, 8).toString('hex');
  const markAt = b.indexOf(MARK);

  const found = {};
  for (const n of NAMES) {
    found[n] = { ascii: b.indexOf(Buffer.from(n, 'latin1')) >= 0,
                 utf16: b.indexOf(u16(n)) >= 0 };
  }

  rows.push({
    file: path.relative(ROOT, f),
    kind: legacy ? 'OLE2' : 'modern',
    bytes0_3: b.slice(0, 4).toString('hex'),
    bytes4_7: head4,
    claim1_head: head4 === '00000004',
    claim1_mark: markAt >= 0 ? markAt : false,
    names: found,
  });
}

const modern = rows.filter(r => r.kind === 'modern');
const legacy = rows.filter(r => r.kind === 'OLE2');

const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : 'n/a';

console.log(`corpus: ${rows.length} files  (${modern.length} modern, ${legacy.length} OLE2)\n`);

console.log('--- CLAIM-1a: bytes 4..7 == 00 00 00 04 ---');
const h = modern.filter(r => r.claim1_head).length;
console.log(`  modern: ${h}/${modern.length} (${pct(h, modern.length)})`);
const hl = legacy.filter(r => r.claim1_head).length;
console.log(`  OLE2  : ${hl}/${legacy.length}`);
const distinct = {};
for (const r of modern) distinct[r.bytes4_7] = (distinct[r.bytes4_7] || 0) + 1;
console.log('  distinct values seen (modern):', JSON.stringify(distinct));
const d0 = {};
for (const r of modern) d0[r.bytes0_3] = (d0[r.bytes0_3] || 0) + 1;
console.log('  bytes 0..3 (modern):', JSON.stringify(d0));

console.log('\n--- CLAIM-1b: sequence 34f6e647 56e64737 f2 present ---');
const m = modern.filter(r => r.claim1_mark !== false).length;
console.log(`  modern: ${m}/${modern.length} (${pct(m, modern.length)})`);
const ml = legacy.filter(r => r.claim1_mark !== false).length;
console.log(`  OLE2  : ${ml}/${legacy.length}`);
const offs = modern.filter(r => r.claim1_mark !== false).map(r => r.claim1_mark);
if (offs.length) {
  const uniq = [...new Set(offs)];
  console.log(`  first-occurrence offsets: ${uniq.length === 1 ? uniq[0] + ' (constant)' : 'min ' + Math.min(...offs) + ' max ' + Math.max(...offs)}`);
}

console.log('\n--- CLAIM-2: stream naming, DisplayLists__ZLB vs DisplayLists ---');
for (const n of NAMES) {
  const a = rows.filter(r => r.names[n].ascii).length;
  const u = rows.filter(r => r.names[n].utf16).length;
  console.log(`  ${n.padEnd(20)} ascii ${String(a).padStart(2)}/${rows.length}   utf16le ${String(u).padStart(2)}/${rows.length}`);
}
console.log('\n  per-file (utf16le hit shown as U, ascii as A):');
for (const r of rows) {
  const tag = n => (r.names[n].utf16 ? 'U' : '') + (r.names[n].ascii ? 'A' : '') || '-';
  console.log(`    ${r.kind.padEnd(6)} ZLB:${tag('DisplayLists__ZLB').padEnd(2)} DL:${tag('DisplayLists').padEnd(2)} PNG:${tag('PreviewPNG').padEnd(2)}  ${r.file}`);
}
