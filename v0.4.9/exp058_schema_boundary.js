'use strict';
// Bounded declaration-prefix reader. Does not scan ahead or decode nodes.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const XT=require('../parasolid/v0.1/src/xt-reader');
const P=require('../parser/v0.1/src/parser-core');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function binary(b){
 const h=XT.readHeader(b);let o=h.end+9;const entries=[];
 function need(n){if(o+n>b.length)throw Error('truncated at '+o);}
 while(o<b.length){
  const start=o;let letters='';while(o<b.length&&b[o]>=65&&b[o]<=90)letters+=String.fromCharCode(b[o++]);
  if(!letters)throw Error('expected declaration or Z marker at '+start);
  if(letters==='Z')return {header:h,entries,end:start,nextHex:b.subarray(start,start+20).toString('hex'),preamble:b.subarray(h.end,h.end+9).toString('hex')};
  need(1);const len=b[o++];if(!len)throw Error('zero name length at '+o);need(len+4);
  const name=b.subarray(o,o+len).toString('ascii');o+=len;
  if(!/^[a-z_][a-z0-9_]*$/.test(name))throw Error('invalid name '+name);
  const code=b.readUInt16BE(o),storedFlagWord=b.readUInt16BE(o+2);o+=4;
  let extension=null;
  // Observed code-zero declarations have a length-prefixed extension string.
  if(code===0){need(1);const n=b[o++];need(n);extension=b.subarray(o,o+n).toString('ascii');o+=n;}
  entries.push({offset:start,end:o,letters,name,code,storedFlagWord,extension});
 }
 throw Error('missing Z boundary');
}
function textPrefix(text){
 const s=text.slice(text.indexOf('**END_OF_HEADER')).replace(/\r?\n/g,'');
 const desc=/T(\d+) /.exec(s);assert(desc);
 let o=desc.index+desc[0].length+Number(desc[1]);
 const size=/^(\d+) /.exec(s.slice(o));assert(size);o+=size[0].length;
 const schema=s.slice(o,o+Number(size[1]));assert(/^SCH_\d+_\d+_\d+$/.test(schema));o+=Number(size[1]);
 const pre=/^230 0 \d+ \d+ /.exec(s.slice(o));assert(pre,'unknown text preamble');o+=pre[0].length;
 const entries=[];
 while(o<s.length){
  if(s[o]==='Z')return {entries,end:o,next:s.slice(o,o+65),preamble:pre[0]};
  const m=/^([A-Z]+)(\d+) /.exec(s.slice(o));assert(m,'declaration at '+o);o+=m[0].length;
  const name=s.slice(o,o+Number(m[2]));o+=Number(m[2]);
  const nums=/^(\d+) (\d+) /.exec(s.slice(o));assert(nums,'numbers at '+o);o+=nums[0].length;
  let extension=null;
  if(Number(nums[1])===0){const n=/^(\d+) /.exec(s.slice(o));assert(n);o+=n[0].length;extension=s.slice(o,o+Number(n[1]));o+=Number(n[1]);}
  entries.push({letters:m[1],name,code:Number(nums[1]),flag:Number(nums[2]),extension});
 }
 throw Error('missing text Z boundary');
}
function stripBanner(b){const e=b.indexOf('**END_OF_HEADER');return e<0?b:b.subarray(b.indexOf('\n',e)+1);}
function run(){
 const base=path.join(ROOT,'test files new/SW2022'),rows=[];
 for(const dir of fs.readdirSync(base).sort()){
  const folder=path.join(base,dir);if(!fs.statSync(folder).isDirectory())continue;
  const xb=fs.readFileSync(path.join(folder,'model.x_b')),xt=fs.readFileSync(path.join(folder,'model.x_t')),sld=fs.readFileSync(path.join(folder,'model.SLDPRT'));
  const body=stripBanner(xb),b=binary(body),t=textPrefix(xt.toString('latin1'));
  const compare=e=>({letters:e.letters,name:e.name,code:e.code,extension:e.extension});
  assert.deepStrictEqual(b.entries.map(compare),t.entries.map(compare));
  const streams=P.decompressOpenSX(sld,x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));
  const key=Object.keys(streams).find(x=>/Config-0-Partition$/.test(x));assert(key);
  const inner=zlib.inflateSync(Buffer.from(streams[key]).subarray(28)),part=binary(inner);
  rows.push({model:dir,sha256:{xb:hash(xb),xt:hash(xt),sldprt:hash(sld),inflatedPartition:hash(inner)},binary:b,text:t,partition:part,wholeFileTextDeclarations:XT.readTextSchemaTable(xt.toString('latin1')).length,flagPairs:b.entries.map((e,i)=>[e.storedFlagWord,t.entries[i].flag])});
 }
 // Failure controls: truncated extension/header and corrupted extension must not silently pass.
 const c=stripBanner(fs.readFileSync(path.join(base,rows[0].model,'model.x_b'))),r=binary(c);
 const ext=r.entries.find(e=>e.extension!==null);
 assert.throws(()=>binary(c.subarray(0,ext.end-1)));
 assert.throws(()=>binary(c.subarray(0,5)));
 const bad=Buffer.from(c);bad[ext.end-1]^=1;assert.notDeepStrictEqual(binary(bad).entries,r.entries);
 const result={date:'2026-09-21',experiment:'EXP-058',baseCommit:'8dcfeb5157ccdcd4bbb8a814197520d61451162a',scriptSHA256:hash(fs.readFileSync(__filename)),scope:'Contiguous named declaration prefix up to first Z, not full schema or node enumeration. Field semantics beyond compared strings/code remain unproven.',models:rows.length,matchedPrefixEntries:rows.reduce((n,r)=>n+r.binary.entries.length,0),controls:3,rows};
 fs.writeFileSync(path.join(__dirname,'EXP058_RESULTS.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({models:result.models,entries:result.matchedPrefixEntries,counts:[...new Set(rows.map(r=>r.binary.entries.length))],partitionCounts:[...new Set(rows.map(r=>r.partition.entries.length))],boundaries:[...new Set(rows.map(r=>r.binary.end))],textGlobal:[...new Set(rows.map(r=>r.wholeFileTextDeclarations))],flagPairs:[...new Set(rows.flatMap(r=>r.flagPairs.map(JSON.stringify)))]}));
}
if(require.main===module)run();module.exports={binary,textPrefix};
