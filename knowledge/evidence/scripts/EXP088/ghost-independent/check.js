'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../../..');
const P=require(root+'/package/src/parasolid/partition'),X=require(root+'/package/src/parasolid/xt');
const {load}=require(root+'/knowledge/evidence/scripts/EXP079/load');
const rows=[];
for(const era of ['SW2011','SW2022'])for(const name of fs.readdirSync(root+'/test files new/'+era)){
 const file=path.join(root,'test files new',era,name,'model.SLDPRT');if(!fs.existsSync(file))continue;
 const row={era,name};rows.push(row);
 try{
 const all=P.streams(fs.readFileSync(file)),key=Object.keys(all).find(k=>/Config-0-GhostPartition$/.test(k));
 if(!key){row.noGhost=true;continue;}
 const sections=P.sections(all[key],0);if(sections.error)throw Error(sections.error);
 const parsed=X.parse(sections.out[0].body,true);if(parsed.error)throw Error(parsed.error);
 const by=new Map(parsed.nodes.map(n=>[n.index,n]));
 const l=load(file);row.featureEnd=l.end;row.featureError=l.err?.message;
 const featureBytes=all[Object.keys(all).find(k=>/Config-0-ResolvedFeatures$/.test(k))];
 const objects=[...l.r.objects.values()],deref=o=>o?.ref?l.r.objects.get(o.ref):o;
 const refs=[];
 for(const o of objects){const c=deref(o.comp);if(c?.class!=='@comp')continue;const raw=Buffer.from(c.x0,'hex');if(raw.length<4)continue;const id=raw.readUInt32LE(0);if(!id)continue;
 const rawAt=c.at+17;
 refs.push({id,class:o.class,feature:o.feature,featureName:l.tops.find(t=>t?.id===o.feature)?.name,object:o.index,component:c.index,componentAt:c.at,rawAt,rawMatches:featureBytes.subarray(rawAt,rawAt+28).equals(raw)});
 }
 row.refs=refs;row.bodies=[];
 for(const a of parsed.nodes.filter(n=>n.name==='ATTRIBUTE')){
 const def=by.get(a.values.definition),label=by.get(def?.values.identifier)?.values.string;if(label!=='GHOST_REF_BODY_ID_2001')continue;
 const body=by.get(a.values.owner),value=by.get(a.values.fields[1]);if(body?.name!=='BODY'||value?.name!=='INT_VALUES')throw Error('unexpected ghost attribute shape');
 const id=value.values.values[0];row.bodies.push({id,index:body.index,type:body.values.body_type,edge:body.values.edge,vertex:body.values.vertex,boundaryPoint:body.values.boundary_point,vertexNext:by.get(body.values.vertex)?.values.next,point:by.get(by.get(body.values.vertex)?.values.point)?.values.pvec,matches:refs.filter(r=>r.id===id)});
 }
 row.controls={shiftedIdMatches:refs.filter(r=>row.bodies.some(b=>b.id===r.id+1000000)).length,wrongFieldMatches:objects.filter(o=>o.class==='@comp'&&row.bodies.some(b=>b.id===Buffer.from(o.x0,'hex').readUInt32LE(4))).length};
 row.duplicateGhostIds=row.bodies.map(b=>b.id).filter((id,i,a)=>a.indexOf(id)!==i);
 row.unmatchedBodies=row.bodies.filter(b=>!b.matches.length).map(b=>b.id);
 row.unmatchedRefs=refs.filter(r=>!row.bodies.some(b=>b.id===r.id));
 }catch(e){row.error=e.message;}
}
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(rows,null,2));
const bodies=rows.flatMap(r=>r.bodies||[]),refs=rows.flatMap(r=>r.refs||[]),points=bodies.filter(b=>b.edge===0&&b.vertex!==0);
console.log(JSON.stringify({files:rows.length,errors:rows.filter(r=>r.error),featureErrors:rows.filter(r=>r.featureError).map(r=>[r.era,r.name,r.featureError]),bodies:bodies.length,refs:refs.length,unmatchedBodies:rows.filter(r=>r.unmatchedBodies?.length).map(r=>[r.era,r.name,r.unmatchedBodies]),unmatchedRefs:rows.filter(r=>r.unmatchedRefs?.length).map(r=>[r.era,r.name,r.unmatchedRefs]),duplicateIds:rows.filter(r=>r.duplicateGhostIds?.length),rawMismatches:refs.filter(r=>!r.rawMatches),points:points.length,pointReferenceKinds:[...new Set(points.flatMap(b=>b.matches.map(r=>r.class+':'+r.featureName)))]},null,2));
