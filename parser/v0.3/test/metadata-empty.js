'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const v1 = require('../../v0.1/src/parser-core');
const v2 = require('../../v0.2/src/parser-core');
const v3 = require('../src/parser-core');

const root = path.resolve(__dirname, '../../..');
const ir = bytes => zlib.inflateRawSync(bytes);
const iz = bytes => zlib.inflateSync(bytes);
const read = model => fs.readFileSync(path.join(root, 'test files new/SW2022', model, 'model.SLDPRT'));

const upgraded = read('C23_cube_sw2011_to_2022');
for (const [version, parser] of [['v0.2', v2], ['v0.3', v3]]) {
  const result = parser.parseSLDPRT(upgraded, ir, iz);
  assert.deepEqual(result.errors, [], version);
  assert.equal(result.faces.length, 6, version);
  assert.equal(result.stats.metadataFaces, 6, version);
  assert.equal(result.warnings.filter(w => w.message.startsWith('Metadata edge table empty;')).length, 6, version);
  for (const face of result.faces) {
    assert.equal(face.metadataError, null, version);
    assert.equal(face.metadata.typeTag, 4001, version);
    assert.equal(face.metadata.edgeRecords.length, 0, version);
    assert(face.edgeAnnotations.some(edge => edge.id !== 0), version);
  }
}

// An empty edge table is an observed omission, not permission to accept an
// incorrect populated table. Flip one ID on a normal cube face and require
// both parsers to retain its geometry but reject the metadata interpretation.
const displayLists = v1.findDisplayLists(read('C00_cube_10mm'), ir, iz);
assert(displayLists);
const original = v3.extractDisplayLists(displayLists);
const face = original.faces.find(f => f.metadata && f.metadata.edgeRecords.length);
assert(face);
const mutated = Buffer.from(displayLists);
mutated.writeUInt32LE(0xffffffff, face.metadata.offset + 72);
for (const [version, parser] of [['v0.2', v2], ['v0.3', v3]]) {
  const result = parser.extractDisplayLists(mutated);
  const changed = result.faces.find(f => f.offset === face.offset);
  assert(changed, version);
  assert.equal(changed.metadata, null, version);
  assert.match(changed.metadataError, /edge labels disagree/, version);
}

console.log('Empty table: 6/6 upgraded faces retain tag; populated mismatch: rejected in v0.2 and v0.3.');
