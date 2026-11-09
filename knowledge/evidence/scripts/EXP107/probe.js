'use strict';
const L = require('./lib.js');
const J = require('/home/user/conv-ids/src/brep/display-join');
const files = process.argv.slice(2);
for (const f of files) {
  const t0 = Date.now();
  const p = L.loadPart(f);
  console.log(f, 'legacy', p.legacy, 'faces', p.parseFaces, 'with metadata', p.df.length, 'brepErr', p.brepError, 'ms', Date.now() - t0);
  if (!p.M) continue;
  const joined = J.join(p.df, p.M);
  const hows = {}; for (const j of joined) hows[j.how] = (hows[j.how] || 0) + 1;
  console.log(' hows', JSON.stringify(hows));
  // units and residual floor: id-only matches with a single candidate and edges equal
  const floor = [];
  p.df.forEach((d, i) => {
    const j = joined[i]; if (!j.face) return;
    const r = L.verdict(p.M, d, j.face);
    if (r.surf.checked) floor.push(r.surf.max);
  });
  floor.sort((a, b) => a - b);
  const q = x => floor.length ? floor[Math.min(floor.length - 1, Math.floor(x * floor.length))] : null;
  console.log(' n checked', floor.length, 'median', q(0.5), 'p90', q(0.9), 'max', floor[floor.length - 1]);
  const v = {}; p.df.forEach((d, i) => { if (joined[i].face) { const r = L.verdict(p.M, d, joined[i].face); v[r.v] = (v[r.v] || 0) + 1; } });
  console.log(' verdicts', JSON.stringify(v));
}
