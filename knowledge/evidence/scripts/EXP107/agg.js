'use strict';
const fs = require('fs');
const rows = fs.readFileSync(__dirname + '/out/parts.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const S = {};
const add = (k, v) => { S[k] = (S[k] || 0) + (v || 0); };
const modern = rows.filter(r => r.legacy === false && r.withMetadata > 0);
const err = rows.filter(r => r.parseError || r.brepError);
console.log('files', rows.length, 'legacy', rows.filter(r => r.legacy).length, 'modern with metadata', modern.length, 'errors', err.length);
console.log('errors:', err.map(r => r.file.split('/').pop() + ' ' + (r.parseError || r.brepError)).join(' | '));
for (const r of modern) {
  add('displayFaces', r.displayFaces); add('withMetadata', r.withMetadata);
  for (const k of Object.keys(r.how)) add('how_' + k, r.how[k]);
  for (const k of Object.keys(r.verdicts)) add('v_' + k, r.verdicts[k]);
  add('surfChecked', r.surfChecked); add('surfOver8', r.surfOver8); add('wrongEdge', r.wrongEdge); add('wrongSurf', r.wrongSurf);
  add('silentWrongById', r.silentWrongById); add('geomMulti', r.geomMulti);
  add('noneRecover0', r.noneRecover[0]); add('noneRecover1', r.noneRecover[1]); add('noneRecoverMany', r.noneRecover.many);
  add('ctrl_n', r.ctrl.n); add('ctrl_rejected', r.ctrl.rejected); add('ctrl_accepted', r.ctrl.accepted); add('ctrl_acceptedStrict', r.ctrl.acceptedStrict);
  add('ctrl_rejectedEdge', r.ctrl.rejectedEdge); add('ctrl_edgeOnlyAccepted', r.ctrl.edgeOnlyAccepted); add('ctrl_surfChecked', r.ctrl.surfChecked); add('ctrl_surfRejected', r.ctrl.surfRejected);
  add('gross_n', r.gross.n); add('gross_over1e3', r.gross.over1e3);
}
console.log(JSON.stringify(S, null, 1));
const bad = modern.map(r => ({ f: r.file.split('/').pop(), n: r.withMetadata, m: r.how.id + (r.how.type || 0) + (r.how.geometry || 0), wrong: r.verdicts.wrong || 0, wrongEdge: r.wrongEdge, wrongSurf: r.wrongSurf, amb: r.how.ambiguous || 0, none: r.how.none || 0, silent: r.silentWrongById, geomMulti: r.geomMulti }))
  .filter(x => x.wrong || x.amb || x.none || x.silent || x.geomMulti).sort((a, b) => b.wrong - a.wrong || b.none - a.none);
console.log('parts with any wrong/ambiguous/none/silent/geomMulti:', bad.length);
console.table(bad.slice(0, 25));
console.log('d2515121 and a4ecc6f5:');
console.log(JSON.stringify(rows.filter(r => /d2515121|a4ecc6f5/.test(r.file)).map(r => ({ f: r.file, how: r.how, verdicts: r.verdicts, ctrl: r.ctrl, gross: r.gross })), null, 1));
