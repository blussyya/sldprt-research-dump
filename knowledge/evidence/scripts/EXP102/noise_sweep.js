'use strict';
/* EXP-102: finer float32-scale display noise sweep (metres). Per amplitude, 5 seeds; every cube
 * target against the full cube set. Reports pick changes against the unperturbed pick. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/conv-dev/src';
const P = require(CONV + '/parasolid/partition'), S = require(CONV + '/parasolid/select'), display = require(CONV + '/display');
const CORPUS = '/home/user/sldprt-research-dump/test files new/SW2011';
const iR = b => zlib.inflateRawSync(b), iZ = b => zlib.inflateSync(b);
const names = fs.readdirSync(CORPUS).filter(n => /^C\d\d_/.test(n)).sort();
const raws = {}, parsed = {};
for (const n of names) { raws[n] = new Uint8Array(fs.readFileSync(path.join(CORPUS, n, 'model.SLDPRT'))); try { const b = P.readBody(raws[n]).parsed; if (!b.error) parsed[n] = b; } catch (e) {} }
const valid = names.filter(n => parsed[n]);
const cand = valid.map(n => ({ name: n, parsed: parsed[n] }));
const cubes = valid.filter(n => /^C(0\d|1[0-3]|18|22|25|26)_/.test(n));
const orig = display.parseSLDPRT;
const base = {};
for (const t of cubes) base[t] = S.choose(raws[t], cand, iR, iZ).name;
const out = {};
for (const amp of [2e-9, 3e-9, 5e-9, 8e-9, 1e-8, 2e-8]) {
  const rows = [];
  for (let seed = 1; seed <= 5; seed++) {
    let st = seed * 9973;
    const rnd = () => (st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
    display.parseSLDPRT = function (raw, a, b) { const d = orig.call(this, raw, a, b); for (const f of d.faces || []) if (f.vertices) for (let k = 0; k < f.vertices.length; k++) f.vertices[k] += amp * rnd(); return d; };
    const ch = [];
    for (const t of cubes) { const pk = S.choose(raws[t], cand, iR, iZ).name; if (pk !== base[t]) ch.push(t + ':' + base[t] + '->' + pk); }
    rows.push(ch);
  }
  display.parseSLDPRT = orig;
  out[amp] = rows;
  console.log('amp', amp, 'changes per seed', rows.map(r => r.length).join(','), JSON.stringify(rows.flat()));
}
fs.writeFileSync('/home/user/dump-validation/knowledge/evidence/scripts/EXP102/out/noise_sweep.json', JSON.stringify(out, null, 1));
