#!/usr/bin/env node
/* EXP-065 / NQ-047 + NQ-043 — what does the Z field count?
 *
 * Method note. Earlier passes at this field tested one hypothesis against one
 * pair of models (EXP-060 compared C04 with C06 and concluded from that pair
 * alone). That is how a real effect gets attributed to the wrong cause. Here
 * every candidate is scored against BOTH complete corpora at once, and a
 * candidate only survives if it matches every model in an era. Candidates that
 * match nothing are still reported, because "no candidate fits" is the result
 * that tells us the field counts something not yet visible in the text form.
 *
 * The text transmit is ASCII, so its contents are readable rather than inferred.
 * The Z record is `Z1 <value> 2 3 ...` and `<value>` is the text form of the
 * same field read as u32be at Z+3 in the binary.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../..');

function textBody(f) {
  const s = fs.readFileSync(f, 'latin1');
  const e = s.indexOf('**END_OF_HEADER');
  return (e >= 0 ? s.slice(e) : s).replace(/\r?\n/g, '');
}
function textZ(body) { const m = body.match(/Z1\s+(\d+)\s+2\s+3/); return m ? parseInt(m[1], 10) : null; }

/* Candidate countable properties of the transmit. Each is a function of the
 * text body alone -- nothing here reads the value it is being compared to. */
function candidates(body) {
  const afterZ = body.slice(body.search(/Z1\s+\d+\s+2\s+3/));
  const ints = (afterZ.match(/\b\d+\b/g) || []).map(Number);
  const distinct = new Set(ints);
  // `255 <id> <type>` appears to introduce records in the node stream.
  const rec255 = (afterZ.match(/(?:^|\s)255\s+(\d+)\s+(\d+)/g) || []);
  const ids255 = rec255.map(s => parseInt(s.trim().split(/\s+/)[1], 10));
  // Trailing attribute records name themselves in capitals.
  const named = (afterZ.match(/[A-Z][A-Z_0-9]{3,}/g) || []);
  const maxInt = ints.length ? Math.max(...ints.filter(x => x < 1e6)) : 0;
  return {
    'integers total': ints.length,
    'distinct integers': distinct.size,
    'max integer (<1e6)': maxInt,
    'max integer + 1': maxInt + 1,
    '255-records': rec255.length,
    'max 255-id': ids255.length ? Math.max(...ids255) : 0,
    'named attribute records': named.length,
    'distinct named records': new Set(named).size,
    'body length / 16': Math.round(afterZ.length / 16),
    'integers <= 400': ints.filter(x => x <= 400).length,
    'distinct integers <= 400': [...distinct].filter(x => x <= 400).length
  };
}

for (const era of ['SW2022', 'SW2011']) {
  const B = path.join(ROOT, 'test files new', era);
  const rows = [];
  for (const d of fs.readdirSync(B).sort()) {
    const f = path.join(B, d, 'model.x_t');
    if (!fs.existsSync(f)) continue;
    const body = textBody(f), z = textZ(body);
    if (z === null) continue;
    rows.push({ d, z, c: candidates(body) });
  }
  console.log(`\n${'='.repeat(72)}\n${era}: ${rows.length} models\n${'='.repeat(72)}`);
  const keys = Object.keys(rows[0].c);
  console.log('candidate'.padEnd(26) + 'exact matches   off-by-constant?');
  for (const k of keys) {
    const hit = rows.filter(r => r.c[k] === r.z).length;
    const diffs = new Set(rows.map(r => r.z - r.c[k]));
    console.log(`  ${k.padEnd(24)} ${String(hit + '/' + rows.length).padStart(7)}      ` +
      (diffs.size === 1 ? `YES, constant offset ${[...diffs][0]}` : `no (${diffs.size} distinct offsets)`));
  }
  // Always show the models that break topology grouping, whatever the outcome.
  console.log('\n  per-model Z (text form):');
  for (const r of rows) console.log(`    ${r.d.padEnd(30)} ${String(r.z).padStart(5)}`);
}
