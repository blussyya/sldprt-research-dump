// Print ModelStamps, DLUpdateStamp and the History/Biography strings for each part.
// A DLUpdateStamp counter lower than ModelStamps' change counter means the display mesh
// may be older than the B-rep. See EXP-087.
// usage: node stamps.js --reader <path to partition.js> part.sldprt [more parts]
// The reader is src/parasolid/partition.js in the converter's inspector branch.
const fs = require('fs');
const args = process.argv.slice(2);
const r = args.indexOf('--reader');
if (r < 0) { console.error('need --reader <path to partition.js>'); process.exit(1); }
const P = require(require('path').resolve(args[r + 1]));
const files = args.filter((_, i) => i !== r && i !== r + 1);

for (const f of files) {
  const all = P.streams(fs.readFileSync(f));
  const out = { file: f.split('/').pop() };
  for (const [k, b] of Object.entries(all)) {
    const name = k.replace(/^Contents\//, '');
    const buf = Buffer.from(b);
    if (/ModelStamps$/.test(name) && buf.length >= 8) out.modelCounter = buf.readUInt32LE(4);
    if (/DLUpdateStamp$/.test(name) && buf.length >= 4) out.dlCounter = buf.readUInt32LE(0);
    if (/^(History|Biography)$/.test(name))
      out[name] = buf.toString('latin1').replace(/\0/g, '').replace(/[^\x20-\x7e]+/g, ' | ').slice(0, 400);
  }
  out.verdict = out.modelCounter == null || out.dlCounter == null ? 'no stamps'
    : out.dlCounter === out.modelCounter ? 'match' : `gap ${out.modelCounter - out.dlCounter}`;
  console.log(JSON.stringify(out));
}
