#!/usr/bin/env node
/* EXP-066 addendum — parser/v0.3 revalidates the INV-026 identities but drops
 * the radius floor, so a zero-filled window validates as a "stored box".
 *
 * parser/v0.3/src/parser-core.js:85 accepts a bounds record when all ten f64
 * are finite, radius >= 0, min <= max, and the midpoint and corner-radius
 * identities hold to 1e-12 ABSOLUTE. That is the same predicate EXP-064 used --
 * minus the one clause EXP-064 added after its first run returned 978,357 false
 * records:
 *
 *   "Without the lower bound the identities are satisfied by denormal garbage --
 *    |C-(A+B)/2| <= 1e-12 is trivially true when every value is ~1e-300 ...
 *    An absolute tolerance needs an absolute scale to mean anything."
 *      -- knowledge/evidence/scripts/EXP064/rawscan-bounds.js
 *
 * All-zero is the degenerate case of exactly that: every identity is satisfied
 * at exactly 0.0.
 *
 * This is a LATENT weakness on the present corpus, not a wrong result: EXP-066
 * independently confirmed all 145 legacy and 142 modern boxes are real and
 * contain their meshes. The point is that the test guarding it could not tell.
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const iR = b => new Uint8Array(zlib.inflateRawSync(b));
const iZ = b => new Uint8Array(zlib.inflateSync(b));

/* v0.3's predicate, transcribed exactly from parser-core.js:85. */
function v3Accepts(rd) {
  const min = [60, 68, 76].map(rd), max = [36, 44, 52].map(rd),
    center = [12, 20, 28].map(rd), radius = rd(84);
  return !(![...min, ...max, ...center, radius].every(Number.isFinite) || radius < 0
    || min.some((x, k) => x > max[k])
    || center.some((x, k) => Math.abs(x - (min[k] + max[k]) / 2) > 1e-12)
    || Math.abs(radius - Math.hypot(...max.map((x, k) => x - center[k]))) > 1e-12);
}
/* EXP-064's predicate: the same, plus the floor. */
const withFloor = rd => v3Accepts(rd) && rd(84) >= 1e-9;

console.log('A. the degenerate case, directly');
const zero = new Float64Array(132 / 8 + 2);
const rdZero = k => zero[k / 8] || 0;
console.log(`   all-zero 132-byte window accepted by v0.3 predicate   : ${v3Accepts(rdZero)}`);
console.log(`   ... accepted with EXP-064's radius floor              : ${withFloor(rdZero)}\n`);

/* How often does a zero-filled 132-byte window actually occur in the streams
 * v0.3 walks? If the answer were "never", the gap would be theoretical. */
console.log('B. zero-filled 132-byte windows present in the decompressed streams');
const files = [];
for (const base of ['test files new/SW2022', 'test files original'])
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) w(p); else if (/\.sldprt$/i.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, base));

let scanned = 0, zeroWindows = 0, filesWithZero = 0;
for (const f of files.sort()) {
  const buf = fs.readFileSync(f);
  if (v1.isOLE2(buf)) continue;
  let dl; try { dl = Buffer.from(v1.findDisplayLists(buf, iR, iZ)); } catch (e) { continue; }
  if (!dl || !dl.length) continue;
  scanned++;
  let hits = 0;
  for (let o = 0; o + 132 <= dl.length; o += 4)
    if (dl.subarray(o, o + 132).every(x => x === 0)) hits++;
  if (hits) { filesWithZero++; zeroWindows += hits; }
}
console.log(`   modern streams scanned                                : ${scanned}`);
console.log(`   files containing >=1 all-zero 132-byte window         : ${filesWithZero}`);
console.log(`   total all-zero windows (4-byte stride)                : ${zeroWindows}`);
console.log(`\n   Each one would be accepted as a valid bounding record by the`);
console.log(`   v0.3 predicate if a face's geometryEnd ever landed on it.`);
console.log(`   Fix is one clause: || !(radius >= 1e-9)`);
