'use strict';
const L = require('./lib.js');
const f = L.loadFile('/home/user/dump-validation/test files online/2016/118a3cb0_cut-z18-b1xh1xl1.SLDPRT');
const c = f.configs.find(x => x.N === 268);
const P = L.assemble(f.all, c.name).parsed;
const by = new Map(P.nodes.map(n => [n.index, n]));
const names = {}; for (const n of P.nodes) names[n.type] = names[n.type] || n.name; console.log('type->name', JSON.stringify(names));
for (const i of [116, 118, 119, 122, 110]) { const n = by.get(i); console.log(i, n.type, n.name, JSON.stringify(n.values).slice(0, 400)); }
const t29 = P.nodes.filter(n => n.type === 29);
console.log('type 29 count', t29.length, t29.map(n => n.index).join(','));
