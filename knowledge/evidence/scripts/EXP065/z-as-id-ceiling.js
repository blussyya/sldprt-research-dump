#!/usr/bin/env node
/* EXP-065 part 2 — is the Z field an ID ceiling rather than a count?
 *
 * Structural counts do not explain it: C04 and C05/C06/C11 have identical
 * integer counts (1,993) and C04 has one FEWER record-introducer, yet reads 309
 * against their 286. A field that is larger where there is less content is not
 * counting content. The remaining reading is an allocation high-water mark:
 * the number of node IDs ever handed out, including IDs freed by later edits.
 *
 * That reading predicts something specific and falsifiable: node IDs should run
 * from 1 up to a ceiling at or just below Z, densely at first and then sparsely,
 * with the gaps being reclaimed IDs. A pure count predicts instead that the
 * highest ID equals the number of nodes.
 *
 * Both corpora, every model, so a single pair cannot drive the conclusion.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../..');

function analyse(f) {
  const s = fs.readFileSync(f, 'latin1').replace(/\r?\n/g, '');
  const at = s.search(/Z1\s+\d+\s+2\s+3/);
  if (at < 0) return null;
  const b = s.slice(at);
  const z = parseInt(b.match(/Z1\s+(\d+)/)[1], 10);
  const ints = new Set((b.match(/\b\d+\b/g) || []).map(Number));
  // densest prefix: the largest N with every integer 1..N present
  let dense = 0; while (ints.has(dense + 1)) dense++;
  // how much of 1..Z is present at all
  let inRange = 0; for (let i = 1; i <= z; i++) if (ints.has(i)) inRange++;
  // is anything above Z present that looks like an ID (small, and <= z+64)?
  let above = 0; for (let i = z + 1; i <= z + 64; i++) if (ints.has(i)) above++;
  return { z, dense, inRange, above, coverage: inRange / z };
}

for (const era of ['SW2022', 'SW2011']) {
  const B = path.join(ROOT, 'test files new', era);
  const rows = [];
  for (const d of fs.readdirSync(B).sort()) {
    const f = path.join(B, d, 'model.x_t');
    if (!fs.existsSync(f)) continue;
    const a = analyse(f); if (a) rows.push({ d, ...a });
  }
  console.log(`\n${'='.repeat(78)}\n${era}  (${rows.length} models)\n${'='.repeat(78)}`);
  console.log('model'.padEnd(30) + ['Z', 'dense 1..N', 'present<=Z', 'cover', 'above Z'].map(x => x.padStart(11)).join(''));
  for (const r of rows)
    console.log(r.d.padEnd(30) + [r.z, r.dense, r.inRange, (r.coverage * 100).toFixed(1) + '%', r.above]
      .map(x => String(x).padStart(11)).join(''));
  const denseBelow = rows.filter(r => r.dense < r.z).length;
  const noneAbove = rows.filter(r => r.above === 0).length;
  console.log(`\n  dense prefix strictly below Z : ${denseBelow}/${rows.length}`);
  console.log(`  no ID-like integer above Z    : ${noneAbove}/${rows.length}`);
  const cov = rows.map(r => r.coverage);
  console.log(`  coverage of 1..Z              : ${(Math.min(...cov) * 100).toFixed(1)}% .. ${(Math.max(...cov) * 100).toFixed(1)}%`);
}
