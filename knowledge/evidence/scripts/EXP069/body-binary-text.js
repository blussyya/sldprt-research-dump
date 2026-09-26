#!/usr/bin/env node
// EXP-069: compare the initial BODY edit script in independently exported
// Parasolid binary and text files. No entity or pointer target is decoded.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {binary} = require('../../../../v0.4.9/exp058_schema_boundary');
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../../../..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const buildLog = fs.readFileSync(path.join(ROOT, 'test files new/SW2022/BUILD_LOG.md'), 'utf8');
const nativeFaces = new Map();
for (const section of buildLog.split(/^## /m).slice(1)) {
  const model = section.split('\n', 1)[0].trim().toLowerCase();
  const count = /Total face count:\s*`(\d+)`/.exec(section);
  if (count) nativeFaces.set(model, Number(count[1]));
}

function stripBanner(buffer) {
  const marker = Buffer.from('**END_OF_HEADER');
  const at = buffer.indexOf(marker);
  assert(at >= 0, 'missing binary banner');
  const end = buffer.indexOf(10, at);
  assert(end >= 0, 'unterminated binary banner');
  return buffer.subarray(end + 1);
}

function textPrefix(raw) {
  const marker = '**END_OF_HEADER';
  let s = raw.slice(raw.indexOf(marker) + marker.length).replace(/\r?\n/g, '');
  assert(raw.includes(marker), 'missing text banner');
  let p = 0;
  function integer() {
    const m = /^\d+/.exec(s.slice(p));
    assert(m, `expected integer at ${p}`);
    p += m[0].length;
    return Number(m[0]);
  }
  function space() { assert.equal(s[p++], ' ', `space at ${p - 1}`); }
  while (s[p] === '*') p++;
  assert.equal(s[p++], 'T');
  const descriptionLength = integer(); space();
  p += descriptionLength;
  const schemaLength = integer(); space();
  const schema = s.slice(p, p + schemaLength); p += schemaLength;
  assert.match(schema, /^SCH_\d+_\d+_\d+$/);
  const maxTypes = integer(); space();
  const zero = integer(); space();
  const nodeType = integer(); space();
  const declaredFields = integer(); space();
  assert.equal(zero, 0);
  assert.equal(nodeType, 12);

  const entries = [];
  while (s[p] !== 'Z') {
    const m = /^([A-Z]+)(\d+) /.exec(s.slice(p));
    assert(m, `expected edit group at ${p}`);
    p += m[0].length;
    const name = s.slice(p, p + Number(m[2])); p += Number(m[2]);
    assert.match(name, /^[a-z_][a-z0-9_]*$/);
    const code = integer(); space();
    const flag = integer(); space();
    let extension = null;
    if (code === 0) {
      const count = integer(); space();
      extension = s.slice(p, p + count); p += count;
    }
    entries.push({letters:m[1],name,code,extension,flag});
  }
  p++;
  const rootIndex = integer(); space();
  const textHighestNodeId = integer();
  return {schema,maxTypes,declaredFields,entries,rootIndex,textHighestNodeId,afterHighestNodeId:s.slice(p)};
}

function run() {
const rows = [];
for (const era of ['SW2011','SW2022']) {
  const base = path.join(ROOT, 'test files new', era);
  for (const model of fs.readdirSync(base).sort()) {
    const directory = path.join(base, model);
    const xbPath = path.join(directory, 'model.x_b');
    const xtPath = path.join(directory, 'model.x_t');
    if (!fs.existsSync(xbPath) && !fs.existsSync(xtPath)) continue;
    assert(fs.existsSync(xbPath) && fs.existsSync(xtPath), `incomplete export pair: ${model}`);
    const xb = fs.readFileSync(xbPath), xt = fs.readFileSync(xtPath);
    const binaryBody = stripBanner(xb);
    const b = binary(binaryBody), t = textPrefix(xt.toString('latin1'));
    assert.equal(b.header.schema, t.schema, model);
    assert.equal(b.entries.length, t.entries.length, model);
    assert.deepEqual(b.entries.map(({letters,name,code,extension})=>({letters,name,code,extension})),
      t.entries.map(({letters,name,code,extension})=>({letters,name,code,extension})), model);
    assert.equal(binaryBody[b.end], 0x5a, `Z at ${b.end}: ${model}`);
    assert.equal(t.rootIndex, 1, model);
    const binaryHighestNodeId = binaryBody.readUInt32BE(b.end + 3);
    const faceCount = nativeFaces.get(`${era.toLowerCase()}/${model.toLowerCase()}`);
    assert(Number.isInteger(faceCount), `missing build-log face count: ${era}/${model}`);
    const delta = binaryHighestNodeId - t.textHighestNodeId;
    assert.equal(delta, era === 'SW2022' ? faceCount : 0, `${era}/${model}: root delta`);
    rows.push({era,model,sha256:{xb:hash(xb),xt:hash(xt)},schema:t.schema,
      maxTypes:t.maxTypes,declaredFields:t.declaredFields,entries:b.entries.length,
      binaryZOffset:b.end,binaryHighestNodeId,textHighestNodeId:t.textHighestNodeId,
      faceCount,delta,
      distinctDeclarationSha256:hash(binaryBody.subarray(0,b.end+1))});
  }
}
assert.equal(rows.length,49);
const summary = ['SW2011','SW2022'].map(era=>{
  const group = rows.filter(r=>r.era===era);
  return {era,files:group.length,distinctPrefixes:new Set(group.map(r=>r.distinctDeclarationSha256)).size,
    declarations:[...new Set(group.map(r=>r.entries))],rootDeltas:[...new Set(group.map(r=>r.delta))]};
});
console.log(JSON.stringify({experiment:'EXP-069',scope:'Initial BODY declarations and post-Z scalar only',summary,rows},null,2));
}
if (require.main === module) run();
module.exports = {stripBanner,textPrefix};
