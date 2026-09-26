#!/usr/bin/env node
// EXP-070: only the first BODY node's index, pointer slots and two precision
// doubles. The slots are not followed to their target nodes.
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {binary} = require('../../../../v0.4.9/exp058_schema_boundary');
const {stripBanner,textPrefix} = require('../EXP069/body-binary-text');
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../../../..');
const rows = [];
let firstBinary;
for (const era of ['SW2011','SW2022']) {
  const base = path.join(ROOT, 'test files new', era);
  for (const model of fs.readdirSync(base).sort()) {
    const dir = path.join(base, model);
    const xbPath = path.join(dir, 'model.x_b'), xtPath = path.join(dir, 'model.x_t');
    if (!fs.existsSync(xbPath) && !fs.existsSync(xtPath)) continue;
    assert(fs.existsSync(xbPath) && fs.existsSync(xtPath), `unpaired ${era}/${model}`);
    const xb = stripBanner(fs.readFileSync(xbPath));
    const b = binary(xb), t = textPrefix(fs.readFileSync(xtPath, 'latin1'));
    const pointerCount = era === 'SW2011' ? 6 : 9; // EXP-068's bounded BODY gap
    assert.equal(xb[b.end], 0x5a, `${era}/${model} Z`);
    assert.equal(xb.readUInt16BE(b.end+1)-1, t.rootIndex, `${era}/${model} root index`);
    const words = t.afterHighestNodeId.trimStart().split(' ');
    assert.equal(words[pointerCount], '1e3', `${era}/${model} res_size`);
    assert.equal(words[pointerCount+1], '1e-8', `${era}/${model} res_linear`);
    const textPointers = words.slice(0,pointerCount).map(x=>{
      assert.match(x, /^\d+$/, `${era}/${model} pointer token`);
      return Number(x);
    });
    const at = b.end+7, doublesAt = at+2*pointerCount;
    assert(doublesAt+16 <= xb.length, `${era}/${model} truncated prefix`);
    const binaryPointers = Array.from({length:pointerCount},(_,i)=>xb.readUInt16BE(at+2*i)-1);
    assert.deepEqual(binaryPointers,textPointers,`${era}/${model} pointers`);
    const size = xb.readDoubleBE(doublesAt),linear=xb.readDoubleBE(doublesAt+8);
    // The observed size is one IEEE-754 ULP above 1000, not bitwise 1000.
    assert(Math.abs(size-1000)<=2e-13,`${era}/${model} binary size`);
    assert.equal(linear,1e-8,`${era}/${model} binary linear`);
    if (!firstBinary) firstBinary={xb,at,doublesAt,textPointers,pointerCount};
    rows.push({era,model,pointers:textPointers.join(','),sizeHex:xb.subarray(doublesAt,doublesAt+8).toString('hex'),
      linearHex:xb.subarray(doublesAt+8,doublesAt+16).toString('hex')});
  }
}
assert.equal(rows.length,49);
// Controls: a single changed pointer word and a changed precision byte must
// fail the exact correspondence/float checks above.
const badPointer=Buffer.from(firstBinary.xb);badPointer[firstBinary.at+1]^=1;
assert.notDeepEqual(Array.from({length:firstBinary.pointerCount},(_,i)=>badPointer.readUInt16BE(firstBinary.at+2*i)-1),firstBinary.textPointers);
const badSize=Buffer.from(firstBinary.xb);badSize[firstBinary.doublesAt]^=1;
assert(Math.abs(badSize.readDoubleBE(firstBinary.doublesAt)-1000)>2e-13);
const summary=['SW2011','SW2022'].map(era=>{
  const group=rows.filter(r=>r.era===era);
  return {era,files:group.length,pointerSlots:era==='SW2011'?6:9,
    distinctPointerPatterns:[...new Set(group.map(r=>r.pointers))],
    sizeHex:[...new Set(group.map(r=>r.sizeHex))],linearHex:[...new Set(group.map(r=>r.linearHex))]};
});
console.log(JSON.stringify({experiment:'EXP-070',scope:'Initial BODY index and pointer values, precision doubles; no target resolution',
  summary,controls:['pointer-word mutation','precision-byte mutation'],models:rows.map(({era,model})=>`${era}/${model}`)},null,2));
