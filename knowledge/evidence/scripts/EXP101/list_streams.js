// Lists stream names and sizes for each SLDPRT using the converter's stream loader only.
const fs=require('fs'),path=require('path');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const root='/home/user/sldprt-research-dump';
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.sldprt$/i.test(e.name))files.push(p);}})(root);
const out={};
for(const f of files){
  let s;try{s=P.streams(fs.readFileSync(f));}catch(e){out[f]={error:String(e)};continue;}
  out[f]=Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.length]));
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log(files.length);
