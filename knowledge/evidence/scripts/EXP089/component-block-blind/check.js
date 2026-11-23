'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..');
const P=require(path.join(root,'package/src/parasolid/partition'));
const {load}=require(path.join(root,'knowledge/evidence/scripts/EXP079/load'));

function walk(dir,out=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory())walk(p,out);else if(/\.sldprt$/i.test(e.name))out.push(p);
  }
  return out;
}
function deref(r,o){return o&&o.ref!==undefined?r.objects.get(o.ref):o;}
function one(file){
  const raw=fs.readFileSync(file),streams=P.streams(raw),tree=load(file),objects=[...tree.r.objects.values()];
  const name=Object.keys(streams).find(k=>/(?:^|\/)Config-0-ResolvedFeatures$/.test(k));
  if(!name)throw Error('no Config-0-ResolvedFeatures');
  const bytes=Buffer.from(streams[name]),components=[];
  for(const c of objects.filter(o=>o&&o.class==='@comp')){
    const block=Buffer.from(c.x0||'','hex');
    if(block.length!==28)throw Error(`component ${c.index} has ${block.length} x0 bytes`);
    // The @comp field reader consumes object tag, u16, u32, u8, u32, u32 before x0.
    const rawAt=c.at+17,rawBlock=bytes.subarray(rawAt,rawAt+28);
    const owners=[];
    for(const o of objects){if(deref(tree.r,o.comp)!==c)continue;
      const top=tree.tops.find(t=>t&&t.at<=o.at&&t.end>=o.end);
      owners.push({class:o.class,index:o.index,at:o.at,feature:o.feature??null,stamp:o.stamp??null,
        top:top?{class:top.class,index:top.index,id:top.id??null,name:top.name??null}:null});
    }
    components.push({index:c.index,at:c.at,end:c.end,rawAt,rawMatch:rawBlock.equals(block),
      words:Array.from({length:7},(_,i)=>block.readUInt32LE(4*i)),owners});
  }
  return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),
    stream:name,streamBytes:bytes.length,treeEnd:!!tree.end,treeError:tree.err?.message||null,
    componentCount:components.length,duplicateIndices:components.map(c=>c.index).filter((x,i,a)=>a.indexOf(x)!==i),components};
}

const files=[];for(const d of ['test files new','test files original','test files online'])walk(path.join(root,d),files);
const rows=files.sort().map(file=>{try{return one(file);}catch(e){return {file:path.relative(root,file),error:e.message};}});
const components=rows.flatMap(r=>(r.components||[]).map(c=>({...c,file:r.file,treeEnd:r.treeEnd})));
const exceptions=components.filter(c=>c.words.slice(1).some(Boolean));
const result={summary:{files:files.length,rowsWithStream:rows.filter(r=>r.components).length,
  completeTrees:rows.filter(r=>r.treeEnd).length,components:components.length,
  rawMismatches:components.filter(c=>!c.rawMatch).length,duplicateIndices:rows.filter(r=>r.duplicateIndices?.length).length,
  tailExceptions:exceptions.length,errorCounts:Object.entries(rows.filter(r=>r.error).reduce((m,r)=>(m[r.error]=(m[r.error]||0)+1,m),{})).sort((a,b)=>b[1]-a[1])},
  exceptions,rows:rows.map(r=>r.error?{file:r.file,error:r.error}:{file:r.file,treeEnd:r.treeEnd,treeError:r.treeError,componentCount:r.componentCount})};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({summary:result.summary,exceptions},null,2));
