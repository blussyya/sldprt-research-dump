'use strict';
/* EXP-102, converter-side checks (read only use of src/parasolid/select.js).
 *   A. all pairs of parsed cubes, both candidate orders, each display against the pair;
 *   B. random candidate permutations of the full set, per target;
 *   C. float32-scale noise added to display vertex positions (metres), per target, full set.
 * Writes OUT/converter_tests.json. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/conv-dev/src';
const P = require(CONV + '/parasolid/partition');
const S = require(CONV + '/parasolid/select');
const display = require(CONV + '/display');
const CORPUS = '/home/user/sldprt-research-dump/test files new/SW2011';
const OUT = '/home/user/dump-validation/knowledge/evidence/scripts/EXP102/out';
const iR = b => zlib.inflateRawSync(b), iZ = b => zlib.inflateSync(b);
const names = fs.readdirSync(CORPUS).filter(n => /^C\d\d_/.test(n)).sort();
const raws = {}, parsed = {};
for (const n of names) {
  raws[n] = new Uint8Array(fs.readFileSync(path.join(CORPUS, n, 'model.SLDPRT')));
  try { const b = P.readBody(raws[n]).parsed; if (!b.error) parsed[n] = b; } catch (e) { /* unparsed */ }
}
const valid = names.filter(n => parsed[n]);
const cand = ns => ns.map(n => ({ name: n, parsed: parsed[n] }));
const res = {};

// A. pairs
res.pairs = [];
for (let i = 0; i < valid.length; i++) for (let j = i + 1; j < valid.length; j++) {
  const a = valid[i], b = valid[j];
  for (const [t, other] of [[a, b], [b, a]]) {
    for (const order of [[a, b], [b, a]]) {
      const r = S.choose(raws[t], cand(order), iR, iZ);
      const row = r.rows.map(x => ({ name: x.name, gap: x.gap, res: x.residual }));
      res.pairs.push({ target: t, other, order: order.join('|'), pick: r.name, matches: r.matches, fitRows: row.filter(x => x.gap !== undefined) });
    }
  }
}

// B. permutations of the full valid set, per target
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
res.perm = {};
for (const t of valid) {
  const picks = {}; const fitSets = {};
  for (let k = 0; k < 40; k++) {
    const order = valid.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const r = S.choose(raws[t], cand(order), iR, iZ);
    picks[r.name] = (picks[r.name] || 0) + 1;
    fitSets[r.matches.join(',')] = (fitSets[r.matches.join(',')] || 0) + 1;
  }
  res.perm[t] = { picks, distinctMatchSets: Object.keys(fitSets).length };
}

// C. display noise, float32 scale (metres), full set, applied to every vertex coordinate
const orig = display.parseSLDPRT;
res.noise = {};
const baseline = {};
for (const t of valid) baseline[t] = S.choose(raws[t], cand(valid), iR, iZ).name;
for (const amp of [1e-9, 1e-8, 1e-7, 1e-6]) {
  let changed = [];
  let ns = 777;
  const nrnd = () => (ns = (ns * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;
  display.parseSLDPRT = function (raw, a, b) {
    const d = orig.call(this, raw, a, b);
    for (const f of d.faces || []) {
      const v = f.vertices; if (!v) continue;
      for (let k = 0; k < v.length; k++) v[k] = v[k] + amp * nrnd();
    }
    return d;
  };
  const picks = {};
  for (const t of valid) {
    const r = S.choose(raws[t], cand(valid), iR, iZ);
    picks[t] = r.name;
    if (r.name !== baseline[t]) changed.push({ target: t, base: baseline[t], now: r.name });
  }
  res.noise[amp] = { changed, picks };
}
display.parseSLDPRT = orig;

fs.writeFileSync(`${OUT}/converter_tests.json`, JSON.stringify(res, null, 1));
const wrongPairs = res.pairs.filter(p => p.pick !== p.target);
console.log('pair rows', res.pairs.length, 'pick != target', wrongPairs.length);
const byT = {};
for (const p of wrongPairs) (byT[p.target + ' <- ' + p.other] = byT[p.target + ' <- ' + p.other] || []).push(p.order + ' => ' + p.pick);
for (const k of Object.keys(byT)) console.log(k, byT[k].join(' ; '));
for (const t of valid) {
  const pk = res.perm[t].picks; const n = Object.keys(pk).length;
  if (n > 1 || !pk[t]) console.log('perm', t, JSON.stringify(pk), 'distinctMatchSets', res.perm[t].distinctMatchSets);
}
for (const amp of Object.keys(res.noise)) console.log('noise', amp, 'changed', res.noise[amp].changed.length, JSON.stringify(res.noise[amp].changed));
