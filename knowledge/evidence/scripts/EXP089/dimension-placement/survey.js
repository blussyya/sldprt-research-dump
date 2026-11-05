'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..');
const base=path.join(root,'knowledge/evidence/scripts/EXP079');
const {Reader}=require(path.join(base,'archive'));
const originalSkip=Reader.prototype.skipToObject;
Reader.prototype.skipToObject=function(...args){
  const at=this.p,hex=originalSkip.apply(this,args);
  (this.exp089Placements||(this.exp089Placements=[])).push({at,end:this.p,hex,target:args[0]});
  return hex;
};
const {load}=require(path.join(base,'load'));

function deref(r,o){return o&&o.ref!==undefined?r.objects.get(o.ref):o;}
function controlled(){
  const out=[];
  for(const era of ['SW2011','SW2022'])for(const name of fs.readdirSync(path.join(root,'test files new',era))){
    const file=path.join(root,'test files new',era,name,'model.SLDPRT');
    if(fs.existsSync(file))out.push(file);
  }
  for(const name of ['cube.SLDPRT','Helical Bevel Gear.SLDPRT']){
    const file=path.join(root,'test files original',name);if(fs.existsSync(file))out.push(file);
  }
  return out;
}
function inspect(file){
  const tree=load(file),r=tree.r,placements=[];
  for(const range of r.exp089Placements||[]){
    const owner=[...r.objects.values()].find(o=>o.at<range.at&&o.end>=range.end&&/^moDisplay.*Dim_c$/.test(o.class));
    const handle=deref(r,owner&&owner.handle),dim=deref(r,handle&&(handle.dim||handle.sketch));
    const top=tree.tops.find(o=>o&&o.at<=range.at&&o.end>=range.end);
    placements.push({
      at:range.at,end:range.end,bytes:range.end-range.at,raw:range.hex,
      owner:owner&&{class:owner.class,index:owner.index,at:owner.at,end:owner.end,views:owner.views},
      handle:handle&&{class:handle.class,index:handle.index,at:handle.at,end:handle.end},
      dimension:dim&&{class:dim.class,index:dim.index,at:dim.at,end:dim.end},
      feature:top&&{class:top.class,id:top.id,name:top.name,index:top.index,at:top.at,end:top.end}
    });
  }
  return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),legacy:tree.legacy,
    complete:tree.end,treeError:tree.err&&tree.err.message,count:tree.count,topRead:tree.tops.length,placements};
}

const rows=controlled().map(file=>{try{return inspect(file);}catch(e){return {file:path.relative(root,file),error:e.stack||e.message};}});
fs.writeFileSync(path.join(__dirname,'survey.json'),JSON.stringify(rows,null,2));
const all=rows.flatMap(r=>r.placements||[]),by={};
for(const p of all){const key=[p.owner&&p.owner.class,p.handle&&p.handle.class,p.dimension&&p.dimension.class,p.bytes,p.feature&&p.feature.name].join('|');by[key]=(by[key]||0)+1;}
console.log(JSON.stringify({files:rows.length,errors:rows.filter(r=>r.error||r.treeError).map(r=>({file:r.file,error:r.error||r.treeError})),placements:all.length,bytes:all.reduce((n,p)=>n+p.bytes,0),by},null,2));
