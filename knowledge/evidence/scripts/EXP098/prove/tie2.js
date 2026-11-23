// real toSTEP path: face counts and tie equality for tied files
const fs=require('fs'),crypto=require('crypto'),lib=require('./lib');
const idx=lib.idx;
const f=process.argv[2];
const raw=fs.readFileSync(f);
const d=idx.parse(raw);
const r=idx.toSTEP(raw,{});
const t=(r.text||r.step||r);
const s=typeof t==='string'?t:JSON.stringify(Object.keys(r));
console.log(f.split('/').pop(),'display',d.faces.length,'STEP ADVANCED_FACE',(s.match(/ADVANCED_FACE\(/g)||[]).length, 'keys',typeof r==='object'?Object.keys(r).join(','):'');
