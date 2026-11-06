'use strict';
// Inventory of the three corpus folders: container type, stream names, DisplayLists version,
// face count from the converter's own parser, configuration IDs and LocalBodies presence.
// Writes inventory.json next to this script. Reads files as data only.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const modern = require(CONV + '/container/modern');
const ole = require(CONV + '/container/ole');
const display = require(CONV + '/display');
const MAX = 128 * 1024 * 1024;
const inflateRaw = b => zlib.inflateRawSync(b, { maxOutputLength: MAX });
const inflateZlib = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const ROOT = '/home/user/dump-validation';
const FOLDERS = ['test files original', 'test files new', 'test files online'];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && /\.sldprt$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = [];
for (const f of FOLDERS) walk(path.join(ROOT, f), files);
files.sort();

const rows = [];
for (const file of files) {
  const buf = fs.readFileSync(file);
  const row = { file: path.relative(ROOT, file), folder: file.split('/')[4], bytes: buf.length };
  row.ole2 = modern.isOLE2(buf);
  try {
    if (!row.ole2) {
      const streams = modern.decompressOpenSX(buf, inflateRaw, inflateZlib);
      row.streamNames = Object.keys(streams);
      row.dlVersion = modern.displayListsVersion(streams);
      row.dlStreamNames = row.streamNames.filter(n => /displaylist/i.test(n));
      row.configIds = [...new Set(row.streamNames.map(n => (/Config-(\d+)-/.exec(n) || [])[1]).filter(x => x !== undefined))].map(Number).sort((a, b) => a - b);
      row.hasLocalBodies = row.streamNames.some(n => /LocalBodies/.test(n));
      row.containerError = null;
    } else {
      row.containerError = null;
    }
  } catch (e) {
    row.containerError = e.message;
  }
  // The converter's own display parser (what the rest of the project reports as readable).
  const p = display.parseSLDPRT(buf, inflateRaw, inflateZlib);
  row.parseFormat = p.format;
  row.parseErrors = p.errors;
  row.faceCount = p.faces.length;
  row.rejected = p.rejected.length;
  row.displayListsLength = p.displayListsLength || null;
  row.stream = p.stream || null;
  rows.push(row);
}
fs.writeFileSync(path.join(__dirname, 'inventory.json'), JSON.stringify(rows, null, 1));
const modernRows = rows.filter(r => !r.ole2);
console.log('files', rows.length, 'modern', modernRows.length, 'ole2', rows.filter(r => r.ole2).length);
console.log('modern with DisplayLists stream found', modernRows.filter(r => r.dlStreamNames && r.dlStreamNames.length).length);
console.log('modern parse with faces>0', modernRows.filter(r => r.faceCount > 0).length);
console.log('modern container errors', modernRows.filter(r => r.containerError).length);
