'use strict';
// Step 6: the claim against the native Parasolid B-rep instead of the display mesh.
// Join: (1) a rawId that names exactly one native face -> that face, whatever its type ('uniqueId', no tag
// used); (2) otherwise src/brep/display-join.js ('joined', uses the tag); (3) faces with no id block
// (no-id files, layout B) -> geometry only: the one analytic native face whose surface holds the display
// vertices (median residual <= 1e-5 m) and whose edge vertices sit in the stored bounds ('geomOnly').
// Control for (3): run it on uniqueId faces too and count agreement.
// Checks:
//   part 1: a92 against native surface type == plane
//   part 3 (faces with a stored cone, analytic surfaces): exact outward normal n at each display vertex
//     (natural normal, flipped when the face's sameSense is false). Control: angle between the display
//     vertex normal and n. Then min(v.n) > 0 (v on the outward side), margin min(v.n) - s, split by sense.
//     Cylinders: |v.axis| (the weak check, run on v and on -v), sign of v . radial(bounds centre) against
//     sense, the exact arc of the face about the axis from its display vertices, acos(s) - half-arc,
//     and the angle from v to the arc's outward bisector.
// Usage: node native_check.js > native_check.out.txt   (one node process; no procedural resolve)
const fs = require('fs'), path = require('path');
const sw = require('/home/user/solidworks-converters/src');
const G = require('/home/user/solidworks-converters/src/geom/eval');
const DJ = require('/home/user/solidworks-converters/src/brep/display-join');
const L = require('./lib');
const rows = fs.readFileSync(path.join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => !r.ole && r.lay !== 'other');
const byFile = {}; for (const r of rows) (byFile[r.file] = byFile[r.file] || []).push(r);
const ANALYTIC = new Set(['plane', 'cylinder', 'cone', 'sphere', 'torus']);
const res = [], errs = [];
for (const [rel, rs] of Object.entries(byFile)) {
  const b = fs.readFileSync(path.join(L.ROOT, rel));
  let M; try { M = sw.brep.model(sw.readBrep(b).parsed); } catch (e) { errs.push(`${rel}: ${e.message}`); continue; }
  const d = sw.parse(b), byOff = new Map(d.faces.map(f => [f.offset, f]));
  const byId = new Map(); for (const f of M.faces) { const k = f.displayId !== undefined ? f.displayId : f.id; if (!byId.has(k)) byId.set(k, []); byId.get(k).push(f); }
  const pts = nf => { const out = []; for (const l of nf.loops) for (const c of l.coedges) { const e = M.edges.get(c.edge); if (e && e.v) for (const v of e.v) if (v !== null) out.push(M.vertices.get(v).p); } return out; };
  const geomOnly = df => {
    const c = M.faces.filter(nf => {
      if (!ANALYTIC.has(nf.surface.type)) return false;
      const r = []; for (let i = 0; i < df.vertexCount; i++) r.push(Math.abs(DJ.residual(nf.surface, [df.vertices[3 * i], df.vertices[3 * i + 1], df.vertices[3 * i + 2]])));
      r.sort((a, b) => a - b); if (!(r[r.length >> 1] <= 1e-5)) return false;
      if (!df.bounds) return true;
      return pts(nf).every(p => p.every((x, k) => x >= df.bounds.min[k] - 1e-5 && x <= df.bounds.max[k] + 1e-5));
    });
    return c.length === 1 ? c[0] : null;
  };
  const dfs = rs.map(r => { const f = byOff.get(r.off); return f ? { ...f, metadata: r.rawId !== null ? { rawId: r.rawId, typeTag: r.tag } : null } : null; });
  const joined = DJ.join(dfs.filter(Boolean), M); let k = 0;
  rs.forEach((r, i) => {
    const df = dfs[i]; if (!df) return;
    const jr = joined[k++];
    let nf = null, how = 'none', ctl = null;
    if (r.rawId !== null) {
      const c = byId.get(r.rawId) || [];
      if (c.length === 1) { nf = c[0]; how = 'uniqueId'; if (ANALYTIC.has(nf.surface.type) && r.a104 === 1 && r.a108 === 1) { const g = geomOnly(df); ctl = g ? g === nf : 'nomatch'; } }
      else if (jr.face) { nf = jr.face; how = 'joined'; }
    } else { nf = geomOnly(df); if (nf) how = 'geomOnly'; }
    const o = { file: rel, lay: r.lay, i: r.i, tag: r.tag, a92: r.a92, has: r.a104 === 1 && r.a108 === 1, how, ctl, type: nf ? nf.surface.type : null, sameSense: nf ? nf.sameSense : null };
    if (nf && o.has && ANALYTIC.has(nf.surface.type) && nf.surface.type !== 'plane') {
      const v = L.unit(r.v), sg = nf.sameSense ? 1 : -1, s = r.s;
      let worstDisp = 0, minVn = 2, n0 = 0;
      for (let q = 0; q < df.vertexCount; q++) {
        const p = [df.vertices[3 * q], df.vertices[3 * q + 1], df.vertices[3 * q + 2]];
        const sd = G.surfaceDistance(nf.surface, p); if (!sd.n) { n0++; continue; }
        const n = sd.n.map(x => x * sg), dn = L.unit([df.normals[3 * q], df.normals[3 * q + 1], df.normals[3 * q + 2]]);
        worstDisp = Math.max(worstDisp, L.angle(n, dn)); minVn = Math.min(minVn, L.dot(v, n));
      }
      Object.assign(o, { s, worstDispDeg: L.deg(worstDisp), minVn, marginExact: minVn - s, noNormal: n0 });
      if (nf.surface.type === 'cylinder') {
        const S = nf.surface, a = S.a, c = df.bounds ? df.bounds.center : [0, 0, 0];
        const rc = L.unit(G.sub(G.sub(c, S.p), G.mul(a, G.dot(G.sub(c, S.p), a))));
        const yc = L.cross(a, rc);
        let lo = Infinity, hi = -Infinity;
        for (let q = 0; q < df.vertexCount; q++) {
          const p = [df.vertices[3 * q], df.vertices[3 * q + 1], df.vertices[3 * q + 2]], w = G.sub(p, S.p);
          const t = Math.atan2(G.dot(w, yc), G.dot(w, rc)); lo = Math.min(lo, t); hi = Math.max(hi, t);
        }
        const mid = (lo + hi) / 2, bis = G.add(G.mul(rc, Math.cos(mid)), G.mul(yc, Math.sin(mid))).map(x => x * sg);
        Object.assign(o, { vAxis: Math.abs(L.dot(v, a)), negVAxis: Math.abs(L.dot(v.map(x => -x), a)), vRadialSign: Math.sign(L.dot(v, rc)),
          halfArcDeg: L.deg((hi - lo) / 2), acosSDeg: L.deg(Math.acos(Math.min(1, s))), vToBisectorDeg: L.deg(L.angle(v, bis)) });
      }
    }
    res.push(o);
  });
}
fs.writeFileSync(path.join(__dirname, 'native_check.jsonl'), res.map(o => JSON.stringify(o)).join('\n') + '\n');
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stat = xs => xs.length ? `n ${xs.length} min ${Math.min(...xs).toFixed(6)} p50 ${q(xs, .5).toFixed(6)} max ${Math.max(...xs).toFixed(6)}` : 'n 0';
const tab = (t, xs, key) => { const m = {}; for (const x of xs) { const k = key(x); m[k] = (m[k] || 0) + 1; } console.log(t, JSON.stringify(m)); };
console.log('B-rep read errors:', errs.length); for (const e of errs) console.log('  ', e.slice(0, 160));
tab('join result:', res, o => `${o.lay}:${o.how}`);
tab('CONTROL geomOnly vs uniqueId (cone faces, analytic):', res.filter(o => o.ctl !== null), o => o.ctl);
console.log('\nPART1 a92 x native type (by join route)');
tab('  ', res.filter(o => o.type), o => `${o.how} a92=${o.a92} ${o.type === 'plane' ? 'plane' : 'nonplane'}`);
tab('  tag vs native type disagreements (uniqueId):', res.filter(o => o.how === 'uniqueId' && o.tag !== null), o => (o.tag === 4001) === (o.type === 'plane') ? 'agree' : `tag ${o.tag} native ${o.type}`);
for (const o of res.filter(o => o.type && ((o.a92 === 1) !== (o.type === 'plane'))).slice(0, 10)) console.log('   mismatch', o.file, o.i, o.how, 'a92', o.a92, 'type', o.type, 'tag', o.tag);
const C = res.filter(o => o.s !== undefined);
console.log(`\nPART3 cone faces on analytic non-planar native faces: ${C.length}`);
tab('  by type and sameSense:', C, o => `${o.type} sameSense=${o.sameSense}`);
console.log('  CONTROL display vertex normal vs exact outward normal, worst angle per face (deg):', stat(C.map(o => o.worstDispDeg)), '| faces over 1 deg:', C.filter(o => o.worstDispDeg > 1).length);
tab('  v on the outward side at every vertex (min v.n > 0), by sameSense:', C, o => `sameSense=${o.sameSense} ${o.minVn > 0}`);
console.log('  margin min(v.n_exact) - s:', stat(C.map(o => o.marginExact)), '| < -1e-6:', C.filter(o => o.marginExact < -1e-6).length, '| > 1e-6:', C.filter(o => o.marginExact > 1e-6).length);
const Y = C.filter(o => o.type === 'cylinder');
console.log(`\n  cylinders: ${Y.length}`);
console.log('  weak check |v.axis|:', stat(Y.map(o => o.vAxis)), '| same check on -v:', stat(Y.map(o => o.negVAxis)));
tab('  sign(v . radial at bounds centre) vs sameSense:', Y, o => `sameSense=${o.sameSense} sign=${o.vRadialSign}`);
console.log('  acos(s) - exact half-arc (deg):', stat(Y.map(o => o.acosSDeg - o.halfArcDeg)), '| acos(s) < half-arc - 0.01 deg (cone narrower than the face):', Y.filter(o => o.acosSDeg < o.halfArcDeg - 0.01).length);
console.log('  angle v to outward arc bisector (deg):', stat(Y.map(o => o.vToBisectorDeg)), '| over 0.5 deg:', Y.filter(o => o.vToBisectorDeg > 0.5).length);
console.log('  half-arc of cylinders with a cone (deg):', stat(Y.map(o => o.halfArcDeg)));
for (const o of Y.sort((a, b) => (a.acosSDeg - a.halfArcDeg) - (b.acosSDeg - b.halfArcDeg)).slice(0, 6)) console.log(`   ${o.file}#${o.i} half-arc ${o.halfArcDeg.toFixed(4)} acos(s) ${o.acosSDeg.toFixed(4)} v-to-bisector ${o.vToBisectorDeg.toFixed(4)} sameSense ${o.sameSense}`);
