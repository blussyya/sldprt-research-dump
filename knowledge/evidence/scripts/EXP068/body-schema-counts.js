#!/usr/bin/env node
// EXP-068: bounded BODY schema-delta arithmetic, using public corpus only.
'use strict';
const fs=require('fs'), path=require('path'), crypto=require('crypto'), assert=require('assert');
const ROOT=process.argv[2] || path.resolve(__dirname,'../../../..');
function parse(raw) {
  const s=raw.replace(/\r?\n/g,'');
  const marker='**END_OF_HEADER'; let i=s.indexOf(marker); assert(i>=0); i+=marker.length;
  function ws(){while(/\s/.test(s[i]||'!'))i++;}
  function integer(){ws(); const m=/^\d+/.exec(s.slice(i));assert(m,'expected integer at '+i);i+=m[0].length;return Number(m[0]);}
  while(s[i]==='*')i++; assert.equal(s[i++],'T');
  const dl=integer();assert.equal(s[i++],' ');i+=dl;
  const sl=integer();assert.equal(s[i++],' ');const schema=s.slice(i,i+sl);i+=sl;
  const maxTypes=integer(), zero=integer(), nodeType=integer(), declared=integer();
  assert.equal(nodeType,12);assert.equal(zero,0);
  const counts={C:0,D:0,I:0,A:0};const output=[];let base=0;
  while(true){ws();const op=s[i++];if(op==='Z')break;assert(op in counts,'unknown edit '+op);counts[op]++;
    if(op==='C'){output.push({base:base++});continue;}
    if(op==='D'){base++;continue;}
    const n=integer();assert.equal(s[i++],' ');const name=s.slice(i,i+n);i+=n;assert(/^[a-z_][a-z0-9_]*$/.test(name));
    const ptrClass=integer(), flag=integer();assert.equal(flag,0,'unsupported field flag');
    let type=null, elements=null;
    if(ptrClass===0){elements=integer();assert.equal(elements,1,'unsupported field length');ws();type=s[i++];assert('dul'.includes(type),'unsupported scalar type');}
    output.push({op,name,ptrClass,type,elements});
  }
  const prefix=s.slice(i).trim().split(/\s+/);
  const res=prefix.findIndex((v,j)=>Number(v)===1000 && Number(prefix[j+1])===1e-8);
  assert(res>=0);
  return {schema,maxTypes,nodeType,declared,counts,baseConsumed:base,produced:output.length,
    output,rootIndex:Number(prefix[0]),pointerGap:res-2,
    baseResSizeOutputIndex:output.findIndex(x=>x.base===7)};
}
const rows=[];
for(const era of ['SW2011','SW2022'])for(const dir of fs.readdirSync(path.join(ROOT,'test files new',era)).sort()){
  const rel=path.join('test files new',era,dir,'model.x_t'),p=path.join(ROOT,rel);if(!fs.existsSync(p))continue;
  const b=fs.readFileSync(p),raw=b.toString('latin1'),r=parse(raw);
  assert.equal(r.produced,r.declared);assert.equal(r.baseConsumed,23);assert.equal(r.rootIndex,1);
  // EXP-067 places base res_size after highest_node_id + six pointers: base field 7.
  assert.equal(r.baseResSizeOutputIndex-1,r.pointerGap);
  // Mutation control: change first Copy to Delete in the input edit script.
  const mutant=parse(raw.replace(/(12\s+\d+\s+)C/, '$1D'));
  assert.equal(mutant.produced,r.produced-1);
  assert.notEqual(mutant.produced,mutant.declared);
  rows.push({file:rel,sha256:crypto.createHash('sha256').update(b).digest('hex'),...r});
}
assert.equal(rows.length,49);
console.log(JSON.stringify({experiment:'EXP-068',scope:'Initial BODY schema only; no entity graph decoding',
  summary:['SW2011','SW2022'].map(era=>({era,files:rows.filter(r=>r.file.includes(era)).length,
    variants:[...new Set(rows.filter(r=>r.file.includes(era)).map(r=>JSON.stringify({declared:r.declared,counts:r.counts,baseConsumed:r.baseConsumed,pointerGap:r.pointerGap})))]})),
  controls:{copyToDeleteMutantsDetected:rows.length},rows},null,2));
