'use strict';
// Survey: for each part, every feature node's tail FILETIME candidate (last 8 bytes, hi/lo order), plus modified.x, in feature order.
const fs=require('fs'),path=require('path');
const {load}=require('../EXP079/load');
const P=require('../../../../package/src/parasolid/partition');
function walk(o,f,seen=new Set()){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);f(o);for(const k of Object.keys(o)){const v=o[k];if(Array.isArray(v))v.forEach(x=>walk(x,f,seen));else if(v&&typeof v==='object')walk(v,f,seen);}}
const ft=(hi,lo)=>{const t=(BigInt(hi)<<32n|BigInt(lo));return Number(t/10000n)/1000-11644473600;}; // unix seconds
const iso=s=>isFinite(s)&&s>0&&s<4e9?new Date(s*1000).toISOString().replace('.000Z','Z').replace(/\.(\d+)Z/,'.$1Z'):'implausible';
function nodes(file){const t=load(file);const rows=[];
 for(const top of t.tops)walk(top,o=>{const n=(o.node&&o.node.tail!==undefined)?o.node:(o.tail!==undefined&&o.id!==undefined?o:null);if(n&&!rows.includes(n)){n.cls=o.class;rows.push(n);}});
 return {t,rows};}
module.exports={nodes,ft,iso,walk};
if(require.main===module){
 const file=process.argv[2];const {t,rows}=nodes(file);
 console.log('# err',t.err&&t.err.message,'nodes',rows.length);
 for(const n of rows){const b=Buffer.from(n.tail,'hex');const hi=b.readUInt32LE(46),lo=b.readUInt32LE(50);const s=ft(hi,lo);
  console.log([n.id,n.name,n.order,n.created.version,n.modified.version,n.modified.x,hi.toString(16),lo.toString(16),iso(s)].join('\t'));}
}
