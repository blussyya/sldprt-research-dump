'use strict';
// Step 2: claim parts 1, 2, 4 (planes never) and 5, from faces.jsonl, per record layout.
// "lit" = words at the claim's literal offsets; "aligned" = shifted +8 on layout B.
// Planar is judged two ways: the display tag (4001) and the mesh (all vertex normals within 1e-3 deg).
// Usage: node flags.js > flags.out.txt
const fs = require('fs'), path = require('path');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const TAG = { 4001: 'plane', 4002: 'cyl', 4003: 'cone', 4004: 'sphere', 4005: 'torus', 4006: 'bspline', 4007: 'blend', 4008: 't4008', 4009: 'swept', 4010: 'spun' };
const top = (m, n = 12) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join('  ') + (Object.keys(m).length > n ? `  ... (${Object.keys(m).length} distinct)` : '');
const tab = (title, xs, key, n) => { const m = {}; for (const r of xs) { const k = key(r); m[k] = (m[k] || 0) + 1; } console.log(`${title}  ${top(m, n)}`); return m; };
const flat = r => r.spreadDeg < 1e-3;
const tname = r => r.tag === null ? 'notag' : TAG[r.tag] || r.tag;

// controls
const A = rows.filter(r => r.lay === 'A');
console.log('CONTROL idBlock() vs converter tag+rawId on layout A:', tab('', A.filter(r => r.idBlockControl !== null), r => r.idBlockControl));
console.log('layouts:', top(tab('', rows, r => r.lay)));
console.log('tag source:', top(tab('', rows, r => `${r.lay}:${r.tagFrom}`)));

for (const lay of ['A', 'B', 'C', 'oleA', 'oleB', 'oleX']) {
  const xs = rows.filter(r => r.lay === lay), files = new Set(xs.map(r => r.file));
  console.log(`\n===== layout ${lay}: ${xs.length} faces, ${files.size} files, tag known on ${xs.filter(r => r.tag !== null).length}`);
  tab('CONTROL tag x mesh-flat:', xs.filter(r => r.tag !== null), r => `${tname(r)}/${flat(r) ? 'flat' : 'curved'}`, 20);
  tab('PART2 literal u128:', xs, r => r.u128, 6);
  tab('PART2 aligned a128:', xs, r => r.a128, 6);
  tab('next word after record (u132 lit):', xs, r => lay === 'A' ? 'hdr' : r.u132, 6);
  tab('PART1 literal u92 x tag:', xs, r => `${r.u92 > 1 ? 'big' : r.u92}/${tname(r)}`, 20);
  tab('PART1 aligned a92 x tag:', xs, r => `${r.a92}/${tname(r)}`, 20);
  tab('PART1 aligned a92 x mesh:', xs, r => `${r.a92}/${flat(r) ? 'flat' : 'curved'}`, 20);
  for (const k of ['a88', 'a96', 'a100']) if (xs[0] && xs[0][k] !== undefined) {
    let ag = 0, n = 0; for (const r of xs) if (r.tag !== null) { n++; if ((r[k] === 1) === (r.tag === 4001)) ag++; }
    console.log(`  shifted-offset control: ${k}===1 <=> tag plane on ${ag}/${n}`);
  }
  tab('aligned a96:', xs, r => r.a96, 6);
  tab('aligned a104,a108 x tag:', xs, r => `${r.a104},${r.a108}/${tname(r)}`, 30);
  tab('a112..a124 all zero when not (1,1):', xs.filter(r => !(r.a104 === 1 && r.a108 === 1)), r => `${r.a104},${r.a108} zero=${r.a112 === 0 && r.a116 === 0 && r.a120 === 0 && r.a124 === 0}`);
  tab('PART4 planes (tag or mesh) with a104=a108=1:', xs.filter(r => (r.tag === 4001 || flat(r))), r => r.a104 === 1 && r.a108 === 1);
  // part 5
  let varying = 0, same = 0; for (const f of files) { const s = new Set(xs.filter(r => r.file === f).map(r => r.a100)); if (s.size > 1) varying++; else same++; }
  console.log(`PART5 a100: files where it varies across faces ${varying}, constant ${same}`);
  tab('PART5 a100 small values:', xs, r => r.a100 < 1000 ? r.a100 : 'big', 8);
}
