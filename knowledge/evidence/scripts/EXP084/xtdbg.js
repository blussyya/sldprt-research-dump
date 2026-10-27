const P=require(require('path').join(__dirname,'../../../../../solidworks-converters/src/')+'parasolid/partition.js');
const fs=require('fs');const f=process.argv[2];
const r=P.readBody(fs.readFileSync(f),{});const p=r.parsed;
console.log('error:',p.error,'nodes',p.nodes.length,'schema',p.header&&p.header.schema);
for(const n of p.nodes.slice(-4))console.log(n.type,n.name,n.index,n.start,n.end,JSON.stringify(n.values).slice(0,300));
const seen=[...new Set(p.nodes.map(n=>n.type))];console.log('types',seen.join(','));
for(const e of p.edits.filter(e=>[85,86,87,88,89,100,163,184].includes(e.type)||e.ops==='NEW'))console.log('edit',e.type,e.name,e.declared,e.ops,e.fields.map(f=>f.name+':'+f.kind+':'+f.count).join(' '));
