'use strict';
// Shared helpers for the EXP110 disprove scripts. Reads the 132-byte bounds record's tail.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = '/home/user/sldprt-research-dump';
const DIRS = ['test files online', 'test files new/SW2022', 'test files new/SW2011', 'test files original'];

function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.sldprt$/i.test(e.name)) out.push(p);
  }
  return out;
}
// Every SLDPRT, deduplicated by content (first path wins); dup list kept for the record.
function corpus() {
  const files = [], seen = new Map(), dups = [];
  for (const d of DIRS) for (const p of walk(path.join(ROOT, d), []).sort()) {
    const h = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
    if (seen.has(h)) { dups.push([p, seen.get(h)]); continue; }
    seen.set(h, p); files.push({ path: p, rel: path.relative(ROOT, p), sha1: h });
  }
  return { files, dups };
}

function tail(raw) {
  if (!raw || raw.length < 132) return null;
  const d = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const u = o => d.getUint32(o, true), f = o => d.getFloat32(o, true);
  return { u88: u(88), u92: u(92), u96: u(96), u100: u(100), u104: u(104), u108: u(108),
    f112: f(112), f116: f(116), f120: f(120), f124: f(124), u112: u(112), u116: u(116), u120: u(120), u124: u(124), u128: u(128),
    head0: u(0), head4: u(4), head8: u(8) };
}

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => Math.hypot(a[0], a[1], a[2]);
const unit = a => { const m = norm(a); return m ? [a[0] / m, a[1] / m, a[2] / m] : [0, 0, 0]; };
const deg = x => x * 180 / Math.PI;

function normalsOf(f) { const out = []; for (let i = 0; i < f.vertexCount; i++) out.push([f.normals[3 * i], f.normals[3 * i + 1], f.normals[3 * i + 2]]); return out; }

// Smallest cone holding a set of unit vectors, approximately: start at the normalised mean, then
// repeatedly step the axis toward the worst vector with a shrinking step (Badoiu-Clarkson style on
// the sphere). Returns {axis, cos} where cos = min n.axis. Good to ~1e-4 rad, enough for a 45 deg split.
function minCone(ns) {
  let a = unit(ns.reduce((s, n) => [s[0] + n[0], s[1] + n[1], s[2] + n[2]], [0, 0, 0]));
  if (norm(a) === 0) a = ns[0];
  for (let k = 1; k <= 2000; k++) {
    let w = null, wc = 2; for (const n of ns) { const c = dot(n, a); if (c < wc) { wc = c; w = n; } }
    const t = 1 / (k + 1);
    a = unit([a[0] + (w[0] - a[0]) * t, a[1] + (w[1] - a[1]) * t, a[2] + (w[2] - a[2]) * t]);
  }
  let c = 2; for (const n of ns) c = Math.min(c, dot(n, a));
  return { axis: a, cos: c };
}
// Angle between two vectors, accurate near 0 (atan2 of |a x b| and a.b; no unit-length assumption).
// The first version used acos(n.n0) on float32 normals and read 0.02 deg on faces with one distinct
// normal, because |n| is 1 +- 1e-7; this replaces it.
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angle = (a, b) => Math.atan2(norm(cross(a, b)), dot(a, b));
function spread(ns) { // largest angle between any normal and the first (planarity test on the mesh)
  let m = 0; for (const n of ns) m = Math.max(m, angle(n, ns[0]));
  return m;
}

// The face's id block for layouts B and C, which src/display.js does not read. o points at the first
// thing after the bounds record. B: (8,100,2) array, u32 flag, then as C. C: u32 flag (1), positions
// (12,100,2) array, normals (12,100,2) array, u32 scalar flag [+ two (4,100,2) arrays], 3 reserved u32,
// rawId, 3 f64 direction, u32 tag. Same grammar as src/display.js metadata() minus the first array.
function idBlock(dv, o, end, hasA8) {
  const u = x => { if (x + 4 > end) throw Error('past end'); return dv.getUint32(x, true); };
  const arr = (x, s) => { if (u(x) !== s || u(x + 4) !== 100 || u(x + 8) !== 2) throw Error('bad array at ' + x); return x + 16 + s * u(x + 12); };
  if (hasA8) o = arr(o, 8);
  if (u(o) !== 1) throw Error('flag ' + u(o)); o += 4;
  o = arr(o, 12); o = arr(o, 12);
  const sf = u(o); o += 4; if (sf === 1) { o = arr(o, 4); o = arr(o, 4); } else if (sf !== 0) throw Error('scalar flag ' + sf);
  const res = [u(o), u(o + 4), u(o + 8)]; o += 12;
  if (res.some(x => x !== 0)) throw Error('no id block');
  const rawId = u(o), tag = u(o + 28);
  if (tag < 4001 || tag > 4010) throw Error('tag ' + tag);
  return { rawId, tag };
}

module.exports = { ROOT, idBlock, angle, cross, sub3, corpus, tail, dot, norm, unit, deg, normalsOf, minCone, spread };
