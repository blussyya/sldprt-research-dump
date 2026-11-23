'use strict';
// +100 in hex (rawId:value) for a few controlled models and online files. Usage: node u100_peek.js > u100_peek.out.txt
const rows = require('fs').readFileSync(require('path').join(__dirname, 'faces.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const h = x => x === null ? 'null' : (x >>> 0).toString(16).padStart(8, '0');
for (const f of ['SW2022/C00_cube_10mm', 'SW2011/C00_cube_10mm', 'SW2022/C01_cube_20mm', 'SW2022/C02_cube_translated', 'SW2022/C04_cube_hole_5mm', 'SW2011/C04_cube_hole_5mm', 'SW2022/C23_cube_sw2011_to_2022', 'SW2022/C24_cube_sw2022_native', 'SW2011/C22_cube_sw2011_native']) {
  const xs = rows.filter(r => r.file.includes(f + '/')); console.log(f.padEnd(34), xs.map(r => (r.rawId ?? '-') + ':' + h(r.a100)).join(' '));
}
for (const f of ['Cell Holder', 'Engine Base', '2e6e140a', 'd2515121']) { const xs = rows.filter(r => r.file.includes(f)).slice(0, 10); console.log(f.padEnd(34), xs.map(r => (r.rawId ?? '-') + ':' + h(r.a100)).join(' ')); }
