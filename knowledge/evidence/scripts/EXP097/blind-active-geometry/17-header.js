'use strict';
const L = require('./lib.js');
const stepExport = require(L.CONV + '/step/export.js');
const f = L.loadFile(process.argv[2]);
const a = L.assemble(f.all, f.configs.find(x => x.N === +process.argv[3]).name);
const t = stepExport.toSTEP(a.parsed, {}).text;
console.log(t.split('\n').slice(0, 12).join('\n'));
