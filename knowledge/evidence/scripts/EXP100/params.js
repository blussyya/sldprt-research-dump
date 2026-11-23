'use strict';
const display = require('/home/user/conv-dev/src');
const p = '/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT';
const q = '/home/user/sldprt-research-dump/test files online/2019/8cd79ff5_1ESxx.SLDPRT';
const r = '/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT';
for (const [name, path] of [['a4ecc6f5', p], ['8cd79ff5', q], ['2f121983', r]]) {
  const d = display.parse(path);
  const agg = {};
  for (const f of d.faces) {
    const m = f.metadata; if (!m) continue;
    if (![4008, 4010, 4002, 4003].includes(m.typeTag)) continue;
    const key = m.typeTag;
    agg[key] = agg[key] || { n: 0, zeroParams: 0, samples: [] };
    agg[key].n++;
    if (m.parameters.every(x => x === 0)) agg[key].zeroParams++;
    if (agg[key].samples.length < 3) agg[key].samples.push({ raw: m.rawId, dir: m.direction.map(x => +x.toFixed(4)), par: m.parameters.map(x => +x.toFixed(6)) });
  }
  console.log('==', name, JSON.stringify(agg, null, 0));
}
