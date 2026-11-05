'use strict';

// Independent check of three EXP-088 feature-tree claims. This uses the older EXP-079 archive
// reader directly. It does not import the EXP-088 exporter or survey.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../../..');
const P=require(path.join(root,'package/src/parasolid/partition'));
const archive=require('../../EXP079/archive');
const originalSkip=archive.Reader.prototype.skipToObject;
archive.Reader.prototype.skipToObject=function(name,sig){
  const at=this.p,value=originalSkip.call(this,name,sig);
  (this.blindSkips||(this.blindSkips=[])).push({at,end:this.p,target:name});
  return value;
};
const {load}=require('../../EXP079/load');

function deref(r,o){return o&&o.ref!==undefined?r.objects.get(o.ref):o;}
function xmlIndex(raw){
  const text=raw.toString('utf8'),names={},children={};
  for(const m of text.matchAll(/<(?:Feature|Sketch|Extrusion)\b([^>]+)>/g)){
    const id=/\bid="(\d+)"/.exec(m[1]),name=/\bName="([^"]*)"/.exec(m[1]);
    if(!id||!name)continue;
    names[+id[1]]=name[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
    const kids=/\bDissectableChildren="([^"]*)"/.exec(m[1]);
    if(kids)children[+id[1]]=kids[1].split(/[, ]+/).filter(Boolean).map(Number);
  }
  return {names,children};
}

function inspect(rel){
  const file=path.join(root,rel),streams=P.streams(fs.readFileSync(file));
  const featureKey=Object.keys(streams).find(k=>/Config-0-ResolvedFeatures$/.test(k));
  const keywordKey=Object.keys(streams).find(k=>/(^|\/)KeyWords$/.test(k));
  const raw=streams[featureKey],tree=load(file),features=[...tree.r.objects.values()].filter(o=>o&&o.node&&Number.isInteger(o.id));
  const byId=new Map();for(const f of features){const a=byId.get(f.id)||[];a.push(f);byId.set(f.id,a);}
  const childLinks=[];
  for(const owner of features)for(const value of owner.node.children||[]){
    const child=deref(tree.r,value);
    childLinks.push({owner:owner.id,ownerName:owner.name,ownerAt:owner.at,nodeAt:owner.node.at,nodeEnd:owner.node.end,child:child?.id??null,childName:child?.name??null,childIndex:child?.index??value?.ref??null});
  }
  const history=[];
  for(const folder of features.filter(f=>f.class==='moHistoryFolder_c'))for(const value of folder.items||[]){
    const item=deref(tree.r,value),comp=deref(tree.r,item?.comp),targets=byId.get(comp?.feature)||[];
    history.push({itemIndex:item?.index,itemAt:item?.at,itemEnd:item?.end,feature:comp?.feature??null,stamp:comp?.stamp??null,targets:targets.map(t=>({id:t.id,name:t.name,index:t.index}))});
  }
  const xml=keywordKey?xmlIndex(Buffer.from(streams[keywordKey])):{names:{},children:{}};
  const nameChecks=[];for(const [id,name] of Object.entries(xml.names)){const candidates=byId.get(+id)||[];if(candidates.length===1)nameChecks.push({id:+id,xml:name,binary:candidates[0].name,match:name===candidates[0].name});}
  const childChecks=[];for(const [id,kids] of Object.entries(xml.children))childChecks.push({owner:+id,xml:kids,binary:childLinks.filter(x=>x.owner===+id).map(x=>x.child),match:JSON.stringify(kids)===JSON.stringify(childLinks.filter(x=>x.owner===+id).map(x=>x.child))});
  const rest=raw.subarray(tree.r.p);
  return {file:rel,stream:featureKey,bytes:raw.length,rawStartIndex:raw.readUInt32LE(0),rawCount:raw.readUInt16LE(4),loaderCount:tree.count,topRead:tree.tops.length,readOffset:tree.r.p,remainingHex:rest.toString('hex'),loaderEnd:tree.end,loaderError:tree.err?.message||null,children:childLinks,history,nameChecks,childChecks,skips:tree.r.blindSkips||[]};
}

const files=[
  'test files new/SW2022/C00_cube_10mm/model.SLDPRT',
  'test files new/SW2022/C04_cube_hole_5mm/model.SLDPRT',
  'test files new/SW2022/C07_cube_two_holes/model.SLDPRT',
  'test files new/SW2022/C16_loft_spline/model.SLDPRT',
  'test files new/SW2022/C23_cube_sw2011_to_2022/model.SLDPRT',
  'test files new/SW2022/C24_cube_sw2022_native/model.SLDPRT'
];
console.log(JSON.stringify(files.map(inspect),null,2));
