'use strict';
// Shared arithmetic test for a 132-byte bounding record at offset r of a DisplayLists buffer.
// Fields (converter docs/format/displaylists.md): centre +12, max +36, min +60, radius +84.
// Blind: uses no name. Tolerance is relative to box size; box size must be 1 micron to 10 km
// (SolidWorks stores metres); components must be finite and not denormal.
function boxAt(dv, r) {
  if (r < 0 || r + 92 > dv.byteLength) return null;
  const f = o => dv.getFloat64(o, true);
  const c = [12, 20, 28].map(k => f(r + k)), max = [36, 44, 52].map(k => f(r + k));
  const min = [60, 68, 76].map(k => f(r + k)), rad = f(r + 84);
  return { c, max, min, rad };
}
function plausible(x) { return Number.isFinite(x) && (x === 0 || Math.abs(x) >= 1e-300 && Math.abs(x) >= 2.2250738585072014e-308); }
function arithmeticOK(b) {
  if (!b) return false;
  const vals = [...b.c, ...b.max, ...b.min, b.rad];
  if (!vals.every(plausible)) return false;
  if (b.rad < 0) return false;
  for (let k = 0; k < 3; k++) if (b.min[k] > b.max[k]) return false;
  const size = Math.max(...b.max.map((x, k) => x - b.min[k]));
  if (!(size >= 1e-6 && size <= 1e4)) return false;
  const tol = 1e-9 * size;
  for (let k = 0; k < 3; k++) if (Math.abs(b.c[k] - (b.min[k] + b.max[k]) / 2) > tol) return false;
  const d = Math.hypot(...b.max.map((x, k) => x - b.c[k]));
  if (Math.abs(b.rad - d) > tol) return false;
  return true;
}
module.exports = { boxAt, arithmeticOK };
