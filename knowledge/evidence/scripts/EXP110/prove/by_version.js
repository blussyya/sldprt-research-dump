// EXP110: DisplayLists version per file, joined with the tail statistics. usage: node by_version.js out_corpus.jsonl out_controls.jsonl
const fs=require('fs'),zlib=require('zlib');const m=require('/home/user/solidworks-converters/src/container/modern');
let R=[];for(const f of process.argv.slice(2))R=R.concat(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.u92!==undefined));
const files=[...new Set(R.map(r=>r.file))],ver={};
for(const f of files){try{const s=m.decompressOpenSX(fs.readFileSync(f),x=>zlib.inflateRawSync(x),x=>zlib.inflateSync(x));ver[f]=m.displayListsVersion(s);}catch(e){ver[f]='err';}}
const T={};
for(const r of R){const v=ver[r.file];const o=T[v]=T[v]||{files:new Set(),faces:0,tagged:0,u128_1:0,u128_0:0,u128_other:0,u92_ok:0,u92_bad:0,cone:0,tagged_u128_1:0};
 o.files.add(r.file);o.faces++;if(r.tag!=null)o.tagged++;if(r.u128===1)o.u128_1++;else if(r.u128===0)o.u128_0++;else o.u128_other++;if(r.u92<2)o.u92_ok++;else o.u92_bad++;if(r.u104===1&&r.u108===1)o.cone++;if(r.tag!=null&&r.u128===1)o.tagged_u128_1++;}
for(const v of Object.keys(T).sort((a,b)=>a-b)){const o=T[v];o.files=o.files.size;console.log('version',v,JSON.stringify(o));}
fs.writeFileSync(__dirname+'/file_versions.json',JSON.stringify(ver,null,1));
