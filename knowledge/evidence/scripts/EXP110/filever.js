'use strict';
const fs=require('fs');
const S=require('/home/user/conv-dev/src/index');
const rows=fs.readFileSync(__dirname+'/rows.jsonl','utf8').trim().split('\n').map(JSON.parse);
const files=[...new Set(rows.map(r=>r.file))];
const ver={};
for(const f of files){try{const i=S.info('/home/user/sldprt-research-dump/'+f);ver[f]={v:i.displayListsVersion,rel:i.saved&&i.saved.release,schema:i.brep&&i.brep.schema};}catch(e){ver[f]={err:e.message};}}
fs.writeFileSync(__dirname+'/filever.json',JSON.stringify(ver,null,1));
// w96 by version
const m={};
for(const r of rows){const v=ver[r.file].v;const o=m[v]=m[v]||{n:0,w96_0:0,files:new Set(),f0:new Set()};o.n++;o.files.add(r.file);if(r.w[1]===0&&r.tag!==4001){o.w96_0++;o.f0.add(r.file);}}
for(const v of Object.keys(m).sort())console.log(v,'files',m[v].files.size,'faces',m[v].n,'non-plane w96=0',m[v].w96_0,'in files',m[v].f0.size);
