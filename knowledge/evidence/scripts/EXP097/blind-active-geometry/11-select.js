'use strict';
// Blind rule applied to each measured file: candidates = configurations whose native face count
// equals the display face count and whose body box equals the display union (1e-6 m).
// Also reports how many display faces match one-to-one, and the converter's current pick.
const fs = require('fs');
const ids = process.argv.slice(2);
const pick = JSON.parse(fs.readFileSync('converter-pick.json', 'utf8')).filter(x => x.tree === 'converter');
const rows = [];
for (const id of ids) {
  const o = JSON.parse(fs.readFileSync('out-' + id + '.json', 'utf8'));
  const tol = 1e-6;
  const ok = o.configs.filter(c => !c.error);
  const cands = ok.filter(c => c.faceCountEqual && c.diffFullVsUnion <= tol);
  const perFaceFull = cands.filter(c => c.perFaceMatch.matched === o.displayFaces);
  const cp = pick.find(p => p.file.startsWith(id));
  const pickedN = cp && cp.configuration ? +/Config-(\d+)-Partition/.exec(cp.configuration.name)[1] : null;
  const pc = ok.find(c => c.config === pickedN);
  rows.push({
    id, file: o.file, displayFaces: o.displayFaces, headers: o.headers, configs: o.configs.length,
    candidatesUnionAndFaces: cands.map(c => c.config), candidatesPerFace22: perFaceFull.map(c => c.config),
    minDiffOtherConfigs_mm: Math.min(...ok.filter(c => !cands.includes(c)).map(c => c.diffFullVsUnion)) * 1000,
    convergedPick: pickedN, convergedPickDiff_mm: pc ? pc.diffFullVsUnion * 1000 : null, convergedPickFaces: pc ? pc.nativeFaces : null,
    convergedPickDisplayVerticesOutside: pc ? pc.displayVerticesOutsideFullBox : null,
    errors: o.configs.filter(c => c.error).map(c => c.config + ':' + c.error),
  });
}
process.stdout.write(JSON.stringify(rows, null, 1) + '\n');
