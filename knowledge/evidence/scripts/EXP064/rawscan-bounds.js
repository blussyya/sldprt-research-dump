// EXP-064 verification A: locate bounding records WITHOUT any face walker.
//
// EXP-061 found the record via v0.2's face offsets; EXP-062 found it via its own
// walker. Both select candidates with a header-recognition assumption. This
// script uses no walker at all: it scans every byte offset in DisplayLists and
// accepts a position purely on the arithmetic of the ten f64 at +12..+91.
// Selection is therefore independent of both parsers.
//
// A hit must satisfy, on all three axes:
//   centre  == (min+max)/2        exactly (<=1e-12)
//   radius  == |max-centre|       exactly (<=1e-12)
// and be non-degenerate (radius > 0) so all-zero regions cannot qualify --
// that was the defect in the first EXP-061 matcher.
//
// Ordering (min <= max) is NOT part of selection. It is measured afterwards,
// because EXP-062's countermodel shows the two identities alone cannot decide
// which triple is which. If ordering held by construction it would prove nothing;
// it is only evidence because a hit could have failed it.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const iR = b => zlib.inflateRawSync(Buffer.from(b)), iZ = b => zlib.inflateSync(Buffer.from(b));

// A coordinate is plausible if it is exactly zero or a real length in metres.
// Without the lower bound the identities are satisfied by denormal garbage --
// |C-(A+B)/2| <= 1e-12 is trivially true when every value is ~1e-300, which is
// why a first run of this script "found" 978,357 records. An absolute tolerance
// needs an absolute scale to mean anything.
// Coordinates get an upper bound only. A lower bound is wrong: real records
// carry residues like 4.34e-19 where the true coordinate is 0, and requiring
// "zero or >= 1e-9" rejected three genuine faces (C16 f0, C17 f0/f1) whose
// identities hold to 0.0. Discrimination comes from the RADIUS floor instead --
// denormal garbage has every value ~1e-300, radius included, so R >= 1e-9 alone
// removes all 977,049 false hits while keeping every real record.
const fin = n => Number.isFinite(n) && Math.abs(n) <= 100;

function scan(dl) {
  const hits = [];
  for (let o = 0; o + 132 <= dl.length; o++) {
    const C = [dl.readDoubleLE(o + 12), dl.readDoubleLE(o + 20), dl.readDoubleLE(o + 28)];
    if (!C.every(fin)) continue;
    const A = [dl.readDoubleLE(o + 36), dl.readDoubleLE(o + 44), dl.readDoubleLE(o + 52)];
    if (!A.every(fin)) continue;
    const B = [dl.readDoubleLE(o + 60), dl.readDoubleLE(o + 68), dl.readDoubleLE(o + 76)];
    if (!B.every(fin)) continue;
    const R = dl.readDoubleLE(o + 84);
    if (!fin(R) || !(R >= 1e-9)) continue;
    let ok = true;
    for (let a = 0; a < 3; a++) if (Math.abs(C[a] - (A[a] + B[a]) / 2) > 1e-12) { ok = false; break; }
    if (!ok) continue;
    const rr = Math.hypot(A[0] - C[0], A[1] - C[1], A[2] - C[2]);
    if (Math.abs(R - rr) > 1e-12) continue;
    hits.push({ o, C, A, B, R, ordered: [0, 1, 2].every(a => B[a] <= A[a]) });
  }
  return hits;
}

const dirs = [];
for (const base of ['test files original', 'test files new/SW2022']) {
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) w(p); else if (/\.sldprt$/i.test(e.name)) dirs.push(p);
    }
  })(path.join(ROOT, base));
}

let files = 0, total = 0, ordered = 0, degenerate = 0;
const strides = new Map();
const perFile = [];
for (const f of dirs.sort()) {
  const buf = fs.readFileSync(f);
  if (v1.isOLE2(buf)) continue;
  let dl; try { dl = Buffer.from(v1.findDisplayLists(buf, iR, iZ)); } catch (e) { continue; }
  if (!dl || !dl.length) continue;
  files++;
  const h = scan(dl);
  total += h.length;
  ordered += h.filter(x => x.ordered).length;
  for (let i = 1; i < h.length; i++) strides.set(h[i].o - h[i - 1].o, (strides.get(h[i].o - h[i - 1].o) || 0) + 1);
  perFile.push({ f: path.basename(path.dirname(f)) + '/' + path.basename(f), n: h.length, ord: h.filter(x => x.ordered).length });
}

console.log(`modern files scanned                 ${files}`);
console.log(`records found by arithmetic alone    ${total}`);
console.log(`  of which min <= max on all axes    ${ordered}/${total}`);
console.log(`  of which min >  max on some axis   ${total - ordered}/${total}`);
console.log('\nmost common gaps between consecutive hits in a file:');
[...strides].sort((a, b) => b[1] - a[1]).slice(0, 6)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)} x  ${k} bytes`));
module.exports = { scan };
