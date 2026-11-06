'use strict';
// Inventory: stream names, ModelHeader presence, which configuration the converter selects,
// per-configuration native face counts, and the saved display face count and union of bounds.
const fs = require('fs');
const path = require('path');
const CONV = '/home/user/solidworks-converters/src';
const display = require(path.join(CONV, 'display.js'));
const partition = require(path.join(CONV, 'parasolid/partition.js'));
const modern = require(path.join(CONV, 'container/modern.js'));
const ole = require(path.join(CONV, 'container/ole.js'));
const zlib = require('zlib');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const xt = require(path.join(CONV, 'parasolid/xt.js'));
const topology = require(path.join(CONV, 'parasolid/topology.js'));

function fileBytes(p) { return new Uint8Array(fs.readFileSync(p)); }

function allStreams(raw) {
  if (modern.isOLE2(raw)) {
    const o = ole.read(raw), out = {};
    for (const e of o.entries) try { out[e.name] = new Uint8Array(o.stream(e)); } catch (_) {}
    return out;
  }
  const s = modern.decompressOpenSX(raw, inflateRaw, inflateZlib), out = {};
  for (const k of Object.keys(s)) out[k] = new Uint8Array(s[k]);
  return out;
}

// Parse one configuration's partition the way the converter does (partition + LocalBodies),
// but forced to a named configuration. Returns {parsed, nodeFaces} or {error}.
function partitionBody(all, name) {
  const keys = Object.keys(all);
  const single = { [name]: all[name] };
  const primary = partition.extractPrimary(null, single, undefined, {});
  return primary;
}

const files = process.argv.slice(2);
const out = [];
for (const f of files) {
  const raw = fileBytes(f);
  const all = allStreams(raw);
  const names = Object.keys(all);
  const cfgParts = names.filter(k => /(?:^|\/)Config-\d+-Partition$/.test(k)).sort();
  const cfgHeaders = names.filter(k => /Config-\d+-ModelHeader$/.test(k)).sort();
  const row = { file: path.relative('/home/user/dump-validation', f), partitions: cfgParts, modelHeaders: cfgHeaders,
    hasHeader2: 'Header2' in all };
  const d = display.parseSLDPRT(Buffer.from(raw), inflateRaw, inflateZlib);
  row.displayFaces = d.faces.length;
  row.displayFacesWithBounds = d.faces.filter(x => x.bounds).length;
  let umin = [Infinity, Infinity, Infinity], umax = [-Infinity, -Infinity, -Infinity];
  for (const x of d.faces) if (x.bounds) for (let k = 0; k < 3; k++) { umin[k] = Math.min(umin[k], x.bounds.min[k]); umax[k] = Math.max(umax[k], x.bounds.max[k]); }
  row.displayUnion = { min: umin, max: umax };
  try {
    const r = partition.readBody(Buffer.from(raw));
    row.converter = { source: r.source, kind: r.kind, configuration: r.configuration, nodes: r.parsed.nodes.length, error: r.parsed.error || null,
      faceNodes: r.parsed.nodes.filter(n => n.type === 14).length, nativeFacesInBuild: null };
  } catch (e) { row.converter = { error: e.message }; }
  out.push(row);
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
