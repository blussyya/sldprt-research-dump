'use strict';
// Locate one-face Parasolid sections inside ResolvedFeatures and identify the MFC object that
// contains each one. Section framing is checked before an offset is used.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../../..'),converter=path.join(root,'../solidworks-converters');
const P=require(converter+'/src/parasolid/partition'),X=require(converter+'/src/parasolid/xt');
const N=require(converter+'/src/brep/native'),{load}=require('../../EXP079/load');
const GUID=Buffer.from('231dd571da8148a2a85898b21b89ef99','hex');
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(/\.sldprt$/i.test(e.name))out.push(p);}return out;}
function box(model){const pts=[...model.vertices.values()].map(v=>v.p);if(!pts.length)return null;return {min:[0,1,2].map(k=>Math.min(...pts.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...pts.map(p=>p[k])))};}
function inspect(file){
 const raw=fs.readFileSync(file),streams=P.streams(raw),keys=Object.keys(streams).filter(k=>/Config-\d+-ResolvedFeatures$/.test(k));
 let tree=null;try{tree=load(file);}catch(_){}const objects=tree?[...tree.r.objects.values()]:[],tops=tree?.tops||[],sections=[];
 for(const key of keys){const b=Buffer.from(streams[key]);for(let i=b.indexOf(GUID);i>=0;i=b.indexOf(GUID,i+1)){
  const start=i-4;if(start<0)continue;const q=P.sections(b,start);if(!q.out.length)continue;const section=q.out[0],parsed=X.parse(section.body,true);if(parsed.error)continue;
  const size=b.readUInt32LE(start),end=start+4+size,containing=objects.filter(o=>o.at<=start&&o.end>=end).sort((a,z)=>(a.end-a.at)-(z.end-z.at)),owner=containing[0];
  const enclosing=tops.filter(o=>o&&o.at<=start&&o.end>=end).sort((a,z)=>(a.end-a.at)-(z.end-z.at))[0];let model=null;try{model=N.build(parsed);}catch(_){}
  const compressed=b.readUInt32LE(start+24),ownerRaw=owner?.parasolid&&Buffer.from(owner.parasolid);
  sections.push({stream:key,start,end,size,kind:section.kind,nodes:parsed.nodes.length,faces:parsed.nodes.filter(n=>n.name==='FACE').length,bodies:parsed.nodes.filter(n=>n.name==='BODY').length,
   surfaces:model?.faces.map(f=>f.surface.type)||[],loops:model?.faces.reduce((n,f)=>n+f.loops.length,0)||0,
   edges:model?.edges.size||0,vertices:model?.vertices.size||0,box:model&&box(model),wrapper:{outerSize:start>=5?b.readUInt32LE(start-5):null,flag:start>=1?b[start-1]:null,sizePlusFive:start>=5&&b.readUInt32LE(start-5)===size+5,tail4:end+4<=b.length?b.subarray(end,end+4).toString('hex'):null},
   owner:owner&&{class:owner.class,index:owner.index,at:owner.at,end:owner.end,onPlane:owner.onPlane,guid:owner.guid,rawSize:owner.rawSize,compressedBytes:owner.parasolid?.length,rawMatches:!!ownerRaw&&ownerRaw.equals(b.subarray(start+28,start+28+compressed))},
   feature:enclosing&&{class:enclosing.class,id:enclosing.id,name:enclosing.name,index:enclosing.index,at:enclosing.at,end:enclosing.end}});
 }}return {file:path.relative(root,file),sha256:crypto.createHash('sha256').update(raw).digest('hex'),featureComplete:!!tree?.end,featureError:tree?.err?.message||null,sections};
}
const files=[...walk(path.join(root,'test files new')),...walk(path.join(root,'test files original'))],rows=files.map(file=>{try{return inspect(file);}catch(e){return {file:path.relative(root,file),error:e.message};}}),out={rows};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(out,null,2));const all=rows.flatMap(r=>(r.sections||[]).map(s=>({...s,file:r.file})));
console.log(JSON.stringify({files:files.length,errors:rows.filter(r=>r.error),sections:all.length,onePlane:all.filter(s=>s.faces===1&&s.bodies===1&&s.surfaces.length===1&&s.surfaces[0]==='plane').length,wrapperMatches:all.filter(s=>s.wrapper.sizePlusFive&&s.wrapper.flag===0&&s.wrapper.tail4==='00000000').length,mappedObjects:all.filter(s=>s.owner).length,mappedSketches:all.filter(s=>s.owner?.class==='sgSketch'&&s.owner.onPlane===0).length,rawMatches:all.filter(s=>s.owner?.rawMatches).length,mappedFeatures:all.filter(s=>s.feature).map(s=>[s.feature.name,s.file,s.start])},null,2));
