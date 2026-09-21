#!/usr/bin/env node
// Is Contents/Config-0-Partition actually Parasolid XT?
//
// solid-diff and cadmpeg both say the B-rep lives there. Our README calls the
// stream high-entropy/unread. Both can be true (compressed), so look for the
// XT transmit signatures directly, and in a zlib-inflated view if the raw one
// is opaque.
//
// Parasolid XT transmit files begin with a header line containing the string
// "**ABCDEFGHIJKLMNOPQRSTUVWXYZ" (the XT sentinel) and a schema name like
// "SCH_<something>_13006"; binary transmit carries "PS" early on.

const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = '/home/user/sldprt-research-dump/test files original';
const core = require('/home/user/sldprt-research-dump/parser/v0.1/src/parser-core.js');

const files = [];
(function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) w(p); else if (/\.sldprt$/i.test(e.name)) files.push(p);
} })(ROOT);
files.sort();

const iR = b => zlib.inflateRawSync(Buffer.from(b));
const iZ = b => zlib.inflateSync(Buffer.from(b));

const MARKERS = [
  ['XT sentinel', '**ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['SCH_',        'SCH_'],
  ['13006',       '13006'],
  ['PS_',         'PS_'],
  ['TRANSMIT',    'TRANSMIT'],
  ['PARASOLID',   'PARASOLID'],
];

// Shannon entropy in bits/byte: ~8.0 means compressed/encrypted, ~4-6 means
// structured binary with readable content.
function entropy(b) {
  const f = new Array(256).fill(0);
  for (let i = 0; i < b.length; i++) f[b[i]]++;
  let h = 0;
  for (const c of f) if (c) { const p = c / b.length; h -= p * Math.log2(p); }
  return h;
}

for (const f of files) {
  const buf = fs.readFileSync(f);
  if (core.isOLE2(buf)) continue;
  let s; try { s = core.decompressOpenSX(buf, iR, iZ); } catch (e) { continue; }
  const name = Object.keys(s).find(n => /Config-0-Partition$/.test(n));
  if (!name) { console.log(`no partition: ${path.relative(ROOT, f)}`); continue; }
  const d = Buffer.from(s[name]);

  const hits = MARKERS.filter(([, m]) => d.indexOf(Buffer.from(m, 'latin1')) >= 0)
                      .map(([k]) => k);

  // Try inflating from any zlib header found in the first 4 KB.
  let inner = null;
  for (let i = 0; i < Math.min(d.length - 2, 4096); i++) {
    if (d[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(d[i + 1])) {
      try { const o = zlib.inflateSync(d.subarray(i)); if (o.length > 256) { inner = { off: i, buf: o }; break; } }
      catch (e) { try { const o = zlib.inflateSync(d.subarray(i), { finishFlush: zlib.constants.Z_SYNC_FLUSH }); if (o.length > 256) { inner = { off: i, buf: o, partial: true }; break; } } catch (e2) {} }
    }
  }
  const innerHits = inner ? MARKERS.filter(([, m]) => inner.buf.indexOf(Buffer.from(m, 'latin1')) >= 0).map(([k]) => k) : [];

  console.log(`${path.relative(ROOT, f)}`);
  console.log(`   raw ${String(d.length).padStart(7)} B  H=${entropy(d).toFixed(2)}  head=${d.subarray(0, 16).toString('hex')}`);
  console.log(`   raw markers   : ${hits.length ? hits.join(', ') : 'none'}`);
  if (inner) {
    console.log(`   inner @${inner.off} ${String(inner.buf.length).padStart(7)} B  H=${entropy(inner.buf).toFixed(2)}${inner.partial ? ' (partial)' : ''}`);
    console.log(`   inner markers : ${innerHits.length ? innerHits.join(', ') : 'none'}`);
    const txt = inner.buf.subarray(0, 120).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    console.log(`   inner head    : ${txt}`);
  } else {
    console.log(`   inner         : no zlib member found in first 4 KB`);
  }
}
