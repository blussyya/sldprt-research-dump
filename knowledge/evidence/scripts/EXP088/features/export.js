'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=path.resolve(__dirname,'../../EXP079');
const {Reader}=require(base+'/archive');
const originalSkip=Reader.prototype.skipToObject;
Reader.prototype.skipToObject=function(...args){const at=this.p,result=originalSkip.apply(this,args);(this.exp088Skips||(this.exp088Skips=[])).push({at,end:this.p,target:args[0]});return result;};
const {load}=require(base+'/load');
function extract(file){
 const x=load(file),r=x.r,objects=[...r.objects.values()];
 const features=objects.filter(o=>o.node&&Number.isInteger(o.id));
 const byId=new Map();for(const f of features){const a=byId.get(f.id)||[];a.push(f);byId.set(f.id,a);}
 const resolve=o=>o&&o.ref!==undefined?r.objects.get(o.ref):o;
 const links=[],references=[];
 for(const f of features){
  for(const c of f.node.children||[]){const child=resolve(c);links.push({owner:f.id,ownerIndex:f.index,child:child?.id??null,childIndex:child?.index??c?.ref??null,resolved:!!child});}
  const seen=new Set();
  function walk(o,p){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(o!==f&&o.node&&Number.isInteger(o.id))return;
   if(o.ref!==undefined){const q=resolve(o);if(q&&!q.node)walk(q,p+'.$ref');return;}
   if(Number.isInteger(o.feature)&&Number.isInteger(o.stamp)){const targets=byId.get(o.feature)||[];references.push({owner:f.id,ownerIndex:f.index,path:p,class:o.class,at:o.at,target:o.feature,stamp:o.stamp,targetIndices:targets.map(t=>t.index)});}
   for(const [k,v] of Object.entries(o))if(k!=='node')if(Array.isArray(v))v.forEach((z,i)=>walk(z,p+'.'+k+'['+i+']'));else walk(v,p+'.'+k);
  }walk(f,'feature');
 }
 const history=objects.filter(o=>o.class==='moHistoryFeatItemData_c').map(o=>{const c=resolve(o.comp);return {index:o.index,at:o.at,raw:o.raw,feature:c?.feature??null,stamp:c?.stamp??null,targets:(byId.get(c?.feature)||[]).map(f=>({id:f.id,name:f.name,index:f.index}))};});
 const rest=r.b.subarray(r.p),featuresOut=features.map(f=>({id:f.id,index:f.index,name:f.name,class:f.class,at:f.at,end:f.end,order:f.node.order,created:f.node.created,modified:f.node.modified,nodeTail:f.node.tail}));
 return {file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),streamBytes:r.b.length,readBytes:r.p,topCount:x.count,topRead:x.tops.length,remainingHex:rest.toString('hex'),complete:!!x.end&&x.tops.length===x.count&&(rest.length===0||rest.length===2&&rest.every(v=>v===0)),error:x.err?.message||null,scannedStretches:r.exp088Skips||[],features:featuresOut,children:links,featureReferences:references,history};
}
module.exports={extract};
if(require.main===module)console.log(JSON.stringify(extract(process.argv[2]),null,2));
