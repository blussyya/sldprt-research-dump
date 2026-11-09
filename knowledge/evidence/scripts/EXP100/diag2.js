'use strict';
// (1) Offset test: a point on an offset surface lies at distance |d| from its basis, along the basis normal.
// (2) Axis detail for spun faces: display direction vs native axis, and the normal-meridian residual per face.
const C = '/home/user/conv-dev/src';
const display = require(C), native = require(C + '/brep/native'), E = require(C + '/geom/eval');
const path = process.argv[2];
const d = display.parse(path);
const b = native.build(require(C + '/index').readBrep(path).parsed);
const byId = new Map(); for (const nf of b.faces) { if (!byId.has(nf.id)) byId.set(nf.id, []); byId.get(nf.id).push(nf); }
const out = [];
for (const f of d.faces) {
  const m = f.metadata; if (![4008, 4010].includes(m.typeTag)) continue;
  const nf = (byId.get(m.rawId) || [])[0]; if (!nf) continue;
  const s = nf.surface, n = f.vertexCount, st = Math.max(1, Math.floor(n / 80));
  const row = {raw: m.rawId, tag: m.typeTag, nat: s.type, verts: n};
  if (s.type === 'offset') {
    row.basisType = s.basis.type; row.d = s.d;
    const res = [];
    for (let i = 0; i < n; i += st) {
      const p = [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]];
      try { const r = E.surfaceDistance(s.basis, p); res.push(Math.abs(Math.abs(r.d) - Math.abs(s.d))); } catch (e) { res.push(NaN); }
    }
    const v = res.filter(Number.isFinite);
    row.abs_dist_minus_absd = {max: Math.max(...v), mean: v.reduce((a,x)=>a+x,0)/v.length, n: v.length};
  }
  if (s.type === 'spun') {
    const a = s.a, dir = m.direction, c = s.c;
    row.dirDotAxis = +(dir[0]*a[0]+dir[1]*a[1]+dir[2]*a[2]).toFixed(6);
    row.profileType = s.curve.type;
    const sins = [];
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n/60))) {
      const p = [f.vertices[i*3], f.vertices[i*3+1], f.vertices[i*3+2]], nn = [f.normals[i*3], f.normals[i*3+1], f.normals[i*3+2]];
      const q = [p[0]-c[0], p[1]-c[1], p[2]-c[2]], h = q[0]*a[0]+q[1]*a[1]+q[2]*a[2];
      const r = [q[0]-h*a[0], q[1]-h*a[1], q[2]-h*a[2]], rl = Math.hypot(...r); if (rl < 1e-6) continue;
      const t = [a[1]*r[2]-a[2]*r[1], a[2]*r[0]-a[0]*r[2], a[0]*r[1]-a[1]*r[0]], nl = Math.hypot(...nn);
      sins.push(Math.abs(nn[0]*t[0]+nn[1]*t[1]+nn[2]*t[2]) / (nl * Math.hypot(...t)));
    }
    row.normalMeridianMaxSin = Math.max(...sins);
    row.normalMeridianMeanSin = sins.reduce((x,y)=>x+y,0)/sins.length;
  }
  out.push(row);
}
console.log(JSON.stringify(out.slice(0, 12)));
console.log('rows', out.length, 'spun', out.filter(r=>r.nat==='spun').length);
