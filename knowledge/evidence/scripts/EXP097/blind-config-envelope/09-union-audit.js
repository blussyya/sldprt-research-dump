'use strict';
// Audit of the union used in claim 1: rejected faces, faces with null bounds, and the number
// of modern files that have no DisplayLists stream (outside the 166 denominator).
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const CONV = '/home/user/dump-validation/package/src';
const display = require(CONV + '/display');
const MAX = 128 * 1024 * 1024;
const inf = b => zlib.inflateRawSync(b, { maxOutputLength: MAX }), infz = b => zlib.inflateSync(b, { maxOutputLength: MAX });
const inv = require('./inventory.json');
const ROOT = '/home/user/dump-validation';
let rejected = 0, nullBounds = 0, files = 0, withRejected = [], withNullBounds = [];
for (const row of inv) {
  if (row.ole2 || !row.dlStreamNames || !row.dlStreamNames.length) continue;
  files++;
  const p = display.parseSLDPRT(fs.readFileSync(path.join(ROOT, row.file)), inf, infz);
  rejected += p.rejected.length; if (p.rejected.length) withRejected.push([row.file, p.rejected.length]);
  const nb = p.faces.filter(f => !f.bounds).length; nullBounds += nb; if (nb) withNullBounds.push([row.file, nb]);
}
const noDL = inv.filter(r => !r.ole2 && !(r.dlStreamNames && r.dlStreamNames.length)).length;
console.log(JSON.stringify({ files, rejectedFaces: rejected, nullBoundsFaces: nullBounds, withRejected, withNullBounds, modernWithoutDisplayLists: noDL }, null, 1));
