// EXP-064 verification C: what is actually in the record's undecoded ranges,
// +0..+11 and +92..+131, across every modern file -- selected walker-free.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '../../../..');
const v1 = require(path.join(ROOT, 'parser/v0.1/src/parser-core.js'));
const { scan } = require('./rawscan-bounds.js');
const iR = b => zlib.inflateRawSync(Buffer.from(b)), iZ = b => zlib.inflateSync(Buffer.from(b));

const files = [];
for (const base of ['test files original', 'test files new/SW2022'])
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) w(p); else if (/\.sldprt$/i.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, base));

const head = new Map();
let n = 0, tailAllZero = 0;
const tailF64 = [[], [], [], [], []];
const tailWord = new Map();
const radiusVsTail = [];
for (const f of files.sort()) {
  const buf = fs.readFileSync(f);
  if (v1.isOLE2(buf)) continue;
  let dl; try { dl = Buffer.from(v1.findDisplayLists(buf, iR, iZ)); } catch (e) { continue; }
  if (!dl || !dl.length) continue;
  for (const h of scan(dl)) {
    n++;
    const o = h.o;
    head.set([...dl.subarray(o, o + 12)].join(' '), (head.get([...dl.subarray(o, o + 12)].join(' ')) || 0) + 1);
    const t = dl.subarray(o + 92, o + 132);
    if (!t.some(x => x !== 0)) tailAllZero++;
    // 40 bytes = 5 x f64, or 10 x u32. Record both readings.
    for (let i = 0; i < 5; i++) tailF64[i].push(dl.readDoubleLE(o + 92 + 8 * i));
    for (let i = 0; i < 10; i++) tailWord.set(i + ':' + dl.readUInt32LE(o + 92 + 4 * i),
      (tailWord.get(i + ':' + dl.readUInt32LE(o + 92 + 4 * i)) || 0) + 1);
  }
}
console.log(`records (walker-free)      ${n}`);
console.log(`\n+0..+11  distinct values   ${head.size}`);
[...head].sort((a, b) => b[1] - a[1]).slice(0, 6)
  .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)} x  [${k}]`));

console.log(`\n+92..+131 all-zero         ${tailAllZero}/${n}`);
console.log('read as 5 x f64:');
tailF64.forEach((col, i) => {
  const finite = col.filter(x => Number.isFinite(x) && Math.abs(x) < 1e6 && (x === 0 || Math.abs(x) > 1e-12));
  const uniq = new Set(col.map(x => x.toString()));
  console.log(`  +${92 + 8 * i}: distinct ${String(uniq.size).padStart(5)}  plausible-as-length ${String(finite.length).padStart(5)}/${n}` +
    (uniq.size <= 3 ? `  values ${[...uniq].slice(0, 3).join(', ')}` : ''));
});
console.log('read as 10 x u32, per-slot distinct counts:');
for (let i = 0; i < 10; i++) {
  const d = [...tailWord.keys()].filter(k => k.startsWith(i + ':')).length;
  const top = [...tailWord].filter(([k]) => k.startsWith(i + ':')).sort((a, b) => b[1] - a[1])[0];
  console.log(`  +${String(92 + 4 * i).padStart(3)}: distinct ${String(d).padStart(5)}   most common ${top[0].split(':')[1]} x${top[1]}`);
}
