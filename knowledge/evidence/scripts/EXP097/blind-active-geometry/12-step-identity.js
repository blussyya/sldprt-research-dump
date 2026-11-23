'use strict';
// For a file and a list of configuration numbers: export each assembled configuration to STEP with the
// converter's exporter (exact mode), strip timestamp lines, and compare the texts.
const L = require('./lib.js');
const stepExport = require(L.CONV + '/step/export.js');
const file = process.argv[2];
const nums = process.argv.slice(3).map(Number);
const f = L.loadFile(file);
const texts = {};
for (const N of nums) {
  const c = f.configs.find(x => x.N === N);
  try {
    const a = L.assemble(f.all, c.name);
    const r = stepExport.toSTEP(a.parsed, {});
    texts[N] = r.text;
  } catch (e) { texts[N] = 'ERROR ' + e.message; }
}
const strip = t => t.split('\n').filter(l => !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(l) && !/^FILE_NAME/.test(l)).join('\n');
const base = nums[0];
const res = { file: file.split('/').pop(), configs: nums, stepBytes: {}, identicalToFirst: {} };
for (const N of nums) { res.stepBytes[N] = texts[N].length; res.identicalToFirst[N] = strip(texts[N]) === strip(texts[base]); }
if (process.env.SHOW_DIFF) {
  const A = strip(texts[base]).split('\n'), B = strip(texts[nums[nums.length - 1]]).split('\n');
  let i = 0; while (i < A.length && A[i] === B[i]) i++;
  res.firstDiff = { at: i, a: A[i], b: B[i] };
}
process.stdout.write(JSON.stringify(res) + '\n');
