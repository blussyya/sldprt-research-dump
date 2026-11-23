'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..');
const P=require(path.join(root,'package/src/parasolid/partition'));
const {load}=require(path.join(root,'knowledge/evidence/scripts/EXP079/load'));

function walk(dir,out=[]){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.sldprt$/i.test(e.name))out.push(p);
 }
 return out;
}
const files=[];
for(const d of ['test files new','test files original','test files online'])walk(path.join(root,d),files);

function deref(r,o){return o&&o.ref!==undefined?r.objects.get(o.ref):o;}
function inspect(file){
 const raw=fs.readFileSync(file),streams=P.streams(raw),tree=load(file),objects=[...tree.r.objects.values()];
 const featureKey=Object.keys(streams).find(k=>/Config-0-ResolvedFeatures$/.test(k)),featureBytes=streams[featureKey];
 const owners=new Map();
 for(const o of objects){const c=deref(tree.r,o.comp);if(c?.class!=='@comp')continue;const a=owners.get(c.index)||[];a.push(o);owners.set(c.index,a);}
 const components=objects.filter(o=>o.class==='@comp').map(c=>{
  const bytes=Buffer.from(c.x0,'hex'),words=Array.from({length:7},(_,i)=>bytes.readUInt32LE(4*i));
  const own=(owners.get(c.index)||[]).map(o=>{
   const top=tree.tops.find(t=>t&&t.at<=o.at&&t.end>=o.end);
   return {class:o.class,index:o.index,at:o.at,feature:o.feature??null,stamp:o.stamp??null,
    within:top?{id:top.id??null,name:top.name??null,class:top.class,index:top.index}:null};
  });
  const rawAt=c.at+17,rawMatch=!!featureBytes&&featureBytes.subarray(rawAt,rawAt+28).equals(bytes);
  return {index:c.index,at:c.at,rawAt,rawMatch,v:c.v,flags:c.flags,a:c.a,kind:c.kind,kind2:c.kind2,
   words,remainingHex:bytes.subarray(4).toString('hex'),ff:c.ff??null,x1:c.x1??null,owners:own};
 });
 return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),
  complete:!!tree.end,error:tree.err?.message??null,legacy:!!tree.legacy,components};
}

const rows=files.map(file=>{try{return inspect(file);}catch(e){return {file:path.relative(root,file),error:e.message};}});
const out={rows};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(out,null,2));

const parsed=rows.filter(r=>r.components),components=parsed.flatMap(r=>r.components.map(c=>({...c,file:r.file,legacy:r.legacy})));
const patterns={};for(const c of components){const key=c.words.join(',');patterns[key]=(patterns[key]||0)+1;}
const nonzeroTail=components.filter(c=>c.words.slice(1).some(Boolean));
console.log(JSON.stringify({files:files.length,parsed:parsed.length,complete:parsed.filter(r=>r.complete).length,
 components:components.length,rawMismatches:components.filter(c=>!c.rawMatch).length,
 filesWithTail: new Set(nonzeroTail.map(c=>c.file)).size,nonzeroTail:nonzeroTail.length,
 patterns:Object.entries(patterns).sort((a,b)=>b[1]-a[1]),tailRows:nonzeroTail},null,2));
