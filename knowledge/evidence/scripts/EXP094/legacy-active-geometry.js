#!/usr/bin/env node
'use strict';
/* Select geometry in modern files that predate Config-N-ModelHeader. The saved analytic face-box
 * union is compared with dense edge samples from every face-count-compatible partition. Matching
 * partitions are also exported to normalized STEP to determine whether tied IDs differ in shape. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const S=require('../../../../package');
const M=require('../../../../package/src/container/modern');
const P=require('../../../../package/src/parasolid/partition');
const X=require('../../../../package/src/parasolid/xt');
const native=require('../../../../package/src/brep/native');
const volume=require('../../../../package/src/brep/volume');
const geom=require('../../../../package/src/geom/eval');
const step=require('../../../../package/src/step/write');
const {corpusFiles,relative}=require('../EXP091/common');

function box(points){
  if(!points.length)return null;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of points)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
  return {min,max};
}
const boxError=(a,b)=>Math.max(...a.min.map((x,k)=>Math.abs(x-b.min[k])),...a.max.map((x,k)=>Math.abs(x-b.max[k])));
function modelBox(model){
  const points=[...model.vertices.values()].map(v=>v.p);
  for(const edge of model.edges.values()){
    const p=volume.edgePath(edge,model.vertices);
    for(let i=0;i<=256;i++)points.push(geom.curvePoint(p.c,p.t0+(p.t1-p.t0)*i/256));
  }
  return {box:box(points),samples:points.length};
}
function geometryHash(model){
  const text=step.write(model).text.replace(/'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d'/,"'<time>'");
  return crypto.createHash('sha256').update(text).digest('hex');
}

const rows=[];
for(const file of corpusFiles()){
  const raw=fs.readFileSync(file);if(M.isOLE2(raw))continue;
  let streams;try{streams=P.streams(raw);}catch(_){continue;}
  const names=Object.keys(streams);if(names.some(n=>/Config-\d+-ModelHeader$/.test(n)))continue;
  const parts=names.filter(n=>/Config-\d+-Partition$/.test(n));if(!parts.length)continue;
  if(parts.length===1){rows.push({file:relative(file),configurations:1,onlyConfigId:Number(/Config-(\d+)-/.exec(parts[0])[1])});continue;}
  const display=S.parse(raw),displayPoints=display.faces.flatMap(f=>f.bounds?[f.bounds.min,f.bounds.max]:[]),displayBox=box(displayPoints),configs=[];
  for(const name of parts){
    const id=Number(/Config-(\d+)-/.exec(name)[1]),section=P.sections(streams[name],0).out[0];
    if(!section){configs.push({id,name,error:'no readable first section'});continue;}
    const parsed=X.parse(section.body,true),faces=parsed.nodes.filter(n=>n.type===14).length,entry={id,name,faces,parseError:parsed.error};
    if(!parsed.error&&faces===display.faces.length&&displayBox)try{
      const model=native.build(parsed),sampled=modelBox(model);Object.assign(entry,{sampledBox:sampled.box,samples:sampled.samples,
        boxError:boxError(displayBox,sampled.box),geometryHash:geometryHash(model)});
    }catch(e){entry.modelError=e.message;}
    configs.push(entry);
  }
  configs.sort((a,b)=>a.id-b.id);const matching=configs.filter(c=>c.boxError<=1e-8),hashes=[...new Set(matching.map(c=>c.geometryHash))];
  const nonmatchingErrors=configs.map(c=>c.boxError).filter(x=>Number.isFinite(x)&&x>1e-8);
  rows.push({file:relative(file),displayFaces:display.faces.length,displayBox,configurations:configs.length,
    matchingConfigIds:matching.map(c=>c.id),matchingGeometryHashes:hashes,lowestConfigId:configs[0]?.id,
    lowestMatches:matching.some(c=>c.id===configs[0]?.id),nearestNonmatchingBoxError:Math.min(...nonmatchingErrors),configs});
}

const multi=rows.filter(r=>r.configurations>1),result={summary:{filesWithoutModelHeader:rows.length,
  singleConfigurationFiles:rows.filter(r=>r.configurations===1).length,multiConfigurationFiles:multi.length,
  multiWithMatchingGeometry:multi.filter(r=>r.matchingConfigIds.length).length,
  multiWithOneMatchingGeometryHash:multi.filter(r=>r.matchingGeometryHashes.length===1).length,
  smallestNonmatchingBoxGap:Math.min(...multi.map(r=>r.nearestNonmatchingBoxError)),
  lowestFallbackMisses:multi.filter(r=>!r.lowestMatches).map(r=>r.file),
  matches:multi.map(r=>({file:r.file,ids:r.matchingConfigIds,geometryHashes:r.matchingGeometryHashes.length}))},rows};
fs.writeFileSync(path.join(__dirname,'legacy-active-geometry.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
