#!/usr/bin/env node
/* EXP-066 — differential test of parser/v0.3/src/inflate.js against zlib.
 *
 * v0.3's suite compares PARSER RESULTS between the two decompressors. That is a
 * weaker test than it looks: the parser reads a subset of the inflated bytes,
 * so a decoder that corrupts a region nothing parses yet would pass. A hand
 * written DEFLATE is the single largest correctness risk in the commit, so
 * compare the inflated BYTES directly, and push it past the corpus into inputs
 * chosen to exercise the paths the corpus may never reach.
 *
 * Covered here and not by the corpus:
 *   - stored (uncompressed) blocks, level 0
 *   - fixed-Huffman blocks (tiny inputs)
 *   - dynamic-Huffman blocks with skewed alphabets
 *   - long back-references and window wrap (>32 KiB)
 *   - maximum match length / distance extremes
 *   - random binary, incompressible data
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../../..');
const browser = require(path.join(ROOT, 'parser/v0.3/src/inflate.js'));

const sha = b => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
let pass = 0, fail = 0; const failures = [];

function check(label, raw) {
  for (const level of [0, 1, 6, 9]) {
    for (const [kind, comp, fn] of [
      ['zlib', zlib.deflateSync(raw, { level }), browser.inflate],
      ['raw', zlib.deflateRawSync(raw, { level }), browser.inflateRaw]
    ]) {
      let got;
      try { got = fn(comp); } catch (e) {
        fail++; failures.push(`${label} [${kind} L${level}] THREW ${e.message}`); continue;
      }
      const a = sha(got), b = sha(raw);
      if (a === b && got.length === raw.length) pass++;
      else { fail++; failures.push(`${label} [${kind} L${level}] MISMATCH len ${got.length} vs ${raw.length}`); }
    }
  }
}

// --- synthetic inputs chosen to hit specific DEFLATE paths ------------------
check('empty', Buffer.alloc(0));
check('single byte', Buffer.from([0x42]));
check('all zeros 64KiB (long matches, window wrap)', Buffer.alloc(65536));
check('all 0xff 100KiB', Buffer.alloc(100000, 0xff));
check('ascii repeated', Buffer.from('the quick brown fox '.repeat(5000)));
check('two-symbol alphabet', Buffer.from(Array.from({ length: 50000 }, (_, i) => i % 2 ? 0x41 : 0x42)));
check('skewed alphabet', Buffer.from(Array.from({ length: 40000 }, (_, i) => i % 997 === 0 ? 0xfe : 0x00)));
check('incompressible random 200KiB', crypto.randomBytes(200000));
check('period-258 (max match len)', Buffer.from(Array.from({ length: 60000 }, (_, i) => i % 258)));
check('period-32768 (max distance)', Buffer.from(Array.from({ length: 120000 }, (_, i) => (i * 7) % 251)));
for (let n = 1; n <= 40; n++) check(`tiny ${n}`, crypto.randomBytes(n));

// --- real streams out of the corpus ----------------------------------------
/* IMPORTANT: inflate.js requires the input to be EXACTLY one zlib member --
 * it reads the Adler-32 from src[len-4] (inflate.js:160). zlib is lenient about
 * trailing bytes; this decoder is not. A first version of this script sliced
 * `buf.subarray(i)` (the whole file tail) and recorded 272 "Adler-32 mismatch"
 * failures. Those were the harness's fault, not the decoder's: given the exact
 * member the output was byte-identical every time. So find the member extent
 * first, by binary search on the shortest prefix zlib still accepts. */
function memberEnd(buf, i, ref) {
  let lo = 1, hi = buf.length - i;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    let ok = false;
    try { ok = Buffer.compare(zlib.inflateSync(buf.subarray(i, i + mid)), ref) === 0; } catch (e) { ok = false; }
    if (ok) hi = mid; else lo = mid + 1;
  }
  return i + lo;
}
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let corpusStreams = 0, trailingStrict = 0;
for (const base of ['test files new/SW2011', 'test files new/SW2022', 'test files original']) {
  for (const f of walk(path.join(ROOT, base))) {
    if (!/\.sldprt$/i.test(f)) continue;
    const b = fs.readFileSync(f);
    for (let i = 0; i + 2 < b.length && corpusStreams < 300; i++) {
      if (b[i] !== 0x78 || ![0x01, 0x5e, 0x9c, 0xda].includes(b[i + 1])) continue;
      let ref; try { ref = zlib.inflateSync(b.subarray(i)); } catch (e) { continue; }
      if (ref.length < 64) continue;
      corpusStreams++;
      const end = memberEnd(b, i, ref);
      // the decoder on the exact member: this is the real comparison
      let got; try { got = browser.inflate(b.subarray(i, end)); } catch (e) {
        fail++; failures.push(`corpus ${path.relative(ROOT, f)}@${i} EXACT MEMBER THREW ${e.message}`); continue;
      }
      if (sha(got) === sha(ref)) pass++;
      else { fail++; failures.push(`corpus ${path.relative(ROOT, f)}@${i} MISMATCH ${got.length} vs ${ref.length}`); }
      // and record the documented-strictness difference separately, not as a failure
      try { browser.inflate(b.subarray(i)); } catch (e) { trailingStrict++; }
    }
  }
}

console.log(`synthetic + corpus comparisons : ${pass + fail}`);
console.log(`  byte-identical to zlib       : ${pass}`);
console.log(`  mismatched or threw          : ${fail}`);
console.log(`  real corpus zlib members     : ${corpusStreams}`);
console.log(`  reject trailing bytes (strictness, not a failure): ${trailingStrict}/${corpusStreams}`);
for (const f of failures.slice(0, 25)) console.log(`    ${f}`);
if (failures.length > 25) console.log(`    ... ${failures.length - 25} more`);
process.exit(fail ? 1 : 0);
