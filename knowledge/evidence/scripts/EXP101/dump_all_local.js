// Writes every LocalBodies stream (from the converter's stream loader, bytes only) to scratch files, one per stream.
const fs=require('fs'),path=require('path');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const root='/home/user/sldprt-research-dump';const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root);
const idx=[];let n=0;
for(const f of files){
  let s;try{s=P.streams(fs.readFileSync(f));}catch(e){continue;}
  for(const k of Object.keys(s)) if(/LocalBodies$/.test(k)){
    const name='lb'+String(n++).padStart(2,'0')+'.bin';
    fs.writeFileSync(path.join(out,name),Buffer.from(s[k]));
    idx.push({file:name,source:f,stream:k,bytes:s[k].length});
  }
}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(idx,null,1));
console.log(idx.length);
