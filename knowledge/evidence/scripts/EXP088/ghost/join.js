'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..');
const converter=process.env.SLDPRT_CONVERTER||path.join(root,'../solidworks-converters');
const P=require(converter+'/src/parasolid/partition'),X=require(converter+'/src/parasolid/xt');
const {load}=require('../../EXP079/load');
function inspect(file){
 const raw=fs.readFileSync(file),streams=P.streams(raw),tree=load(file);
 const objects=[...tree.r.objects.values()].filter(x=>x&&x.class),byObj=new Map(objects.map(x=>[x.index,x]));
 const resolve=x=>x&&x.ref?byObj.get(x.ref):x;
 const refs=[];
 for(const o of objects){const c=resolve(o.comp);if(!c||c.class!=='@comp'||!c.x0)continue;
  const id=Buffer.from(c.x0,'hex').readUInt32LE(0);if(!id)continue;
  const top=tree.tops.find(t=>t&&t.at<=o.at&&t.end>=o.end);
  refs.push({id,class:o.class,index:o.index,at:o.at,feature:o.feature,handle:resolve(o.handle),within:top&&{id:top.id,name:top.name,class:top.class},target:tree.tops.filter(t=>t&&t.id===o.feature).map(t=>({id:t.id,name:t.name,class:t.class})),compAt:c.at});
 }
 const ghosts=[];
 for(const [stream,data] of Object.entries(streams).filter(([k])=>/Config-0-GhostPartition$/.test(k))){
  const sections=P.sections(data,0);if(sections.error)throw Error(sections.error);
  for(const section of sections.out){const parsed=X.parse(section.body,true);if(parsed.error)throw Error(parsed.error);const nodes=new Map(parsed.nodes.map(n=>[n.index,n]));
   for(const body of parsed.nodes.filter(n=>n.name==='BODY')){
    const attrs=parsed.nodes.filter(n=>n.name==='ATTRIBUTE'&&n.values.owner===body.index).map(n=>{const def=nodes.get(n.values.definition);return {name:nodes.get(def?.values.identifier)?.values.string,values:n.values.fields.map(i=>nodes.get(i)?.values)}});
    const attr=attrs.find(a=>a.name==='GHOST_REF_BODY_ID_2001');const id=attr?.values.find(v=>v?.values)?.values[0];
    ghosts.push({stream,index:body.index,id,type:body.values.body_type,edge:body.values.edge,vertex:body.values.vertex,point: nodes.get(body.values.boundary_point)?.values.pvec,surface:nodes.get(body.values.boundary_surface)?.values,attributes:attrs,refs:refs.filter(r=>r.id===id)});
   }
  }
 }
 return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),treeComplete:!!tree.end,treeError:tree.err?.message,ghosts,unmatchedRefs:refs.filter(r=>!ghosts.some(g=>g.id===r.id))};
}
if(require.main===module){let files=process.argv.slice(2);if(!files.length)for(const era of ['SW2011','SW2022'])for(const d of fs.readdirSync(path.join(root,'test files new',era))){const p=path.join(root,'test files new',era,d,'model.SLDPRT');if(fs.existsSync(p))files.push(p)}
 const rows=files.map(f=>{try{return inspect(path.resolve(f))}catch(e){return {file:f,error:e.message}}});console.log(JSON.stringify(rows,null,2));}
module.exports={inspect};
