#!/usr/bin/env node
/* EXP-067 — the post-Z field is BODY.highest_node_id.
 *
 * NQ-043 has been chased across EXP-059, 060, 064 and 065 on the premise that
 * `Z` marks a record boundary and the u32be at Z+3 is "some count". The
 * published XT spec says otherwise on both points, and the structure it gives
 * is checkable here.
 *
 * Per the spec:
 *   - `Z` terminates a per-node-type schema-delta edit script. What follows is
 *     the remainder of the FIRST node of that type, not a new record.
 *   - A node is `<nodetype> [<n_elts> if variable] <index> <fields...>`.
 *   - struct BODY_s begins: int highest_node_id; then pointer fields; then
 *     double res_size ("size box", normally 1000) and double res_linear
 *     ("modeller linear precision", normally 1.0e-8).
 *
 * So the text after Z should read: <index> <highest_node_id> <pointers...>
 * 1e3 1e-8. That is a strong positional prediction: the two named doubles must
 * appear, in that order, a fixed number of fields after the candidate.
 *
 * In binary, the spec notes small indices are stored specially (2 bytes), so an
 * int field at Z+3 lands exactly where EXP-059 found its value -- which is why
 * that probe worked at all.
 *
 * This does NOT prove the value equals the maximum node_id in the body; that
 * needs entity records enumerated. It tests the FIELD IDENTIFICATION.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../..');

function postZ(f) {
  const s = fs.readFileSync(f, 'latin1').replace(/\r?\n/g, '');
  const at = s.search(/Z\s*1\s+\d+\s+\d+\s+\d+/);
  if (at < 0) return null;
  // tokens after the Z character
  const toks = s.slice(at + 1).trim().split(/\s+/).slice(0, 24);
  return toks;
}
const num = t => {
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
};

for (const era of ['SW2022', 'SW2011']) {
  const B = path.join(ROOT, 'test files new', era);
  const rows = [];
  for (const d of fs.readdirSync(B).sort()) {
    const f = path.join(B, d, 'model.x_t');
    if (!fs.existsSync(f)) continue;
    const t = postZ(f);
    if (!t) continue;
    // locate the two named constants
    let iSize = -1;
    for (let i = 0; i < t.length - 1; i++) {
      if (num(t[i]) === 1000 && num(t[i + 1]) !== null && Math.abs(num(t[i + 1]) - 1e-8) < 1e-20) { iSize = i; break; }
    }
    rows.push({
      d,
      index: num(t[0]),
      candidate: num(t[1]),
      betweenCandidateAndSize: iSize < 0 ? null : iSize - 2,
      resSize: iSize < 0 ? null : num(t[iSize]),
      resLinear: iSize < 0 ? null : num(t[iSize + 1]),
      tail: t.slice(0, 14).join(' ')
    });
  }
  console.log(`\n${'='.repeat(78)}\n${era}  (${rows.length} models)\n${'='.repeat(78)}`);
  console.log('model'.padEnd(30) + ['index', 'cand', 'gap', 'res_size', 'res_linear'].map(x => x.padStart(11)).join(''));
  for (const r of rows)
    console.log(r.d.padEnd(30) + [r.index, r.candidate, r.betweenCandidateAndSize, r.resSize, r.resLinear]
      .map(x => String(x).padStart(11)).join(''));
  const idx1 = rows.filter(r => r.index === 1).length;
  const gaps = new Set(rows.map(r => r.betweenCandidateAndSize));
  const sized = rows.filter(r => r.resSize === 1000).length;
  const lin = rows.filter(r => r.resLinear !== null && Math.abs(r.resLinear - 1e-8) < 1e-20).length;
  console.log(`\n  index == 1 (spec: index 1 is the root node) : ${idx1}/${rows.length}`);
  console.log(`  res_size == 1000 found                     : ${sized}/${rows.length}`);
  console.log(`  res_linear == 1e-8 immediately after it    : ${lin}/${rows.length}`);
  console.log(`  pointer fields between candidate and res_size: ${[...gaps].join(', ')}` +
    (gaps.size === 1 ? '   <- constant, as a fixed struct requires' : '   <- VARIES'));
  console.log(`  first model's tokens: ${rows[0].tail}`);
}
