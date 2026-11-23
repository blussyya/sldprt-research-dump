// Comparison only: run the converter's readDirectory on each modern file and print what it finds,
// so compare_converter.py can line it up with my own walk (check_all.json).
const fs = require('fs');
const M = require('/home/user/solidworks-converters/src/container/modern.js');
const inv = JSON.parse(fs.readFileSync(__dirname + '/inventory.json'));
const out = [];
for (const r of inv) {
  if (r.kind !== 'modern' || r.head8.slice(8) !== '00000004') continue;
  const buf = fs.readFileSync(r.path);
  let ents = null, err = null;
  try { ents = M.readDirectory(buf); } catch (e) { err = String(e); }
  out.push({ path: r.path, err, entries: ents && ents.map(e => ({ name: e.name, dataStart: e.dataStart,
    compSize: e.compSize, size: e.size, crc: e.crc >>> 0 })) });
}
fs.writeFileSync(__dirname + '/compare_converter.json', JSON.stringify(out));
console.log('files', out.length, 'null', out.filter(o => !o.entries).length);
