'use strict';
// Dump per-feature node fields of one part: id, name, e (12 bytes), order, g, created/modified, tail FILETIME candidates.
const {load}=require('../EXP079/load');
function walk(o,f,seen=new Set()){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);f(o);for(const k of Object.keys(o)){const v=o[k];if(Array.isArray(v))v.forEach(x=>walk(x,f,seen));else if(v&&typeof v==='object')walk(v,f,seen);}}
const file=process.argv[2];const t=load(file);
console.error('count',t.count,'tops',t.tops.length,'err',t.err&&t.err.message);
const rows=[];
for(const top of t.tops)walk(top,o=>{if(o.node&&o.node.tail!==undefined&&o.node.id!==undefined&&!rows.includes(o.node))rows.push(o.node);else if(o.tail!==undefined&&o.id!==undefined&&!rows.includes(o))rows.push(o);});
for(const n of rows)console.log(JSON.stringify({name:n.name,id:n.id,order:n.order,e:n.e,f:n.f,g:n.g,created:n.created,modified:n.modified,h:n.h,str2:n.str2,tail:n.tail}));
