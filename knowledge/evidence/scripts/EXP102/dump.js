'use strict';
/* EXP-102 disprove, step 1. Dumps, for every SW2011 cube:
 *   - the display mesh (faces, vertices, normals) from the SLDPRT, in metres;
 *   - the converter's B-rep face count and box (from parsed body);
 *   - the converter's choose() result for each target display against every cube as candidate.
 * Output: OUT/display/<name>.json and OUT/choose.json. Node only; reads the converter (read only). */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/conv-dev/src';
const P = require(CONV + '/parasolid/partition');
const S = require(CONV + '/parasolid/select');
const display = require(CONV + '/display');
const CORPUS = '/home/user/sldprt-research-dump/test files new/SW2011';
const OUT = '/home/user/dump-validation/knowledge/evidence/scripts/EXP102/out';
fs.mkdirSync(OUT + '/display', { recursive: true });
const iR = b => zlib.inflateRawSync(b), iZ = b => zlib.inflateSync(b);
const names = fs.readdirSync(CORPUS).filter(n => /^C\d\d_/.test(n)).sort();

const parsedBy = {}, raws = {}, dispBy = {}, summary = [];
for (const name of names) {
  const raw = new Uint8Array(fs.readFileSync(path.join(CORPUS, name, 'model.SLDPRT')));
  raws[name] = raw;
  const d = display.parseSLDPRT(raw, iR, iZ);
  const faces = d.faces.map((f, i) => ({
    i, bounds: f.bounds || null, tris: Array.from(f.triangleIndices),
    vertices: Array.from(f.vertices), normals: Array.from(f.normals),
  }));
  dispBy[name] = d;
  fs.writeFileSync(`${OUT}/display/${name}.json`, JSON.stringify({ name, displayFaces: faces.length, faces }));
  let body = null, berr = null;
  try { body = P.readBody(raw).parsed; if (body.error) berr = String(body.error); } catch (e) { berr = e.message; }
  parsedBy[name] = body;
  let brep = null;
  if (body && !body.error) { try { const r = S.brepBox(body); brep = { faces: r.faces, box: r.box }; } catch (e) { berr = e.message; } }
  summary.push({
    name, displayFaces: faces.length,
    displayVerts: faces.reduce((s, f) => s + f.vertices.length / 3, 0),
    brepFaces: brep ? brep.faces : null, brepBoxMin: brep ? brep.box.min : null, brepBoxMax: brep ? brep.box.max : null,
    error: berr,
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 1));

// Converter choose(): each target display against the whole cube set, in ID order.
const cands = names.filter(n => parsedBy[n] && !parsedBy[n].error).map(n => ({ name: n, parsed: parsedBy[n] }));
const choose = {};
for (const t of names) {
  const r = S.choose(raws[t], cands, iR, iZ);
  choose[t] = {
    pick: r.name, matches: r.matches, displayFaces: r.displayFaces, reason: r.reason || null,
    rows: r.rows.map(x => ({ name: x.name, faces: x.faces, gap: x.gap, error: x.error, residual: x.residual })),
  };
}
fs.writeFileSync(`${OUT}/choose.json`, JSON.stringify({ candidates: cands.map(c => c.name), choose }, null, 1));
for (const t of names) console.log(t.padEnd(28), 'pick=', String(choose[t].pick).padEnd(28), 'matches=', choose[t].matches.join(','));
