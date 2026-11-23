#!/usr/bin/env node
'use strict';
/* Test the one EXP-091 configuration envelope that exceeds the saved display. Every framed
 * Parasolid payload is inventoried independently; a deltas section is retained as a parse error. */
const fs=require('fs'),path=require('path');
const S=require('../../../../package');
const P=require('../../../../package/src/parasolid/partition');
const X=require('../../../../package/src/parasolid/xt');
const native=require('../../../../package/src/brep/native');
const volume=require('../../../../package/src/brep/volume');
const geom=require('../../../../package/src/geom/eval');
const prior=require('../EXP091/configuration-bounds.json');

const ROOT=path.resolve(__dirname,'../../../..'),key='ac760485_存矿小端.SLDPRT';
const source=prior.rows.find(r=>r.file.endsWith('/'+key));if(!source)throw Error('EXP-091 outlier row not found');
const file=path.join(ROOT,source.file),raw=fs.readFileSync(file),all=P.streams(raw),display=S.parse(raw);
function box(points){
  if(!points.length)return null;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of points)for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}
  return {min,max};
}
const displayBox=box(display.faces.flatMap(f=>{const p=[];for(let i=0;i<f.vertices.length;i+=3)p.push([f.vertices[i],f.vertices[i+1],f.vertices[i+2]]);return p;}));
const sections=[],edgeSamples=[];
for(const survey of P.survey(raw)){
  const stream=all[survey.stream];
  for(const item of survey.sections){
    const size=stream.readUInt32LE(item.offset),framed=stream.subarray(item.offset,item.offset+4+size),walk=P.sections(framed,0),section=walk.out[0];
    if(!section){sections.push({stream:survey.stream,offset:item.offset,kind:item.kind,frameError:walk.error});continue;}
    const parsed=X.parse(section.body,true),points=parsed.nodes.filter(n=>n.type===29).map(n=>n.values.pvec);
    if(!parsed.error){
      const model=native.build(parsed);
      for(const edge of model.edges.values()){
        const path=volume.edgePath(edge,model.vertices);
        for(let i=0;i<=1024;i++)edgeSamples.push(geom.curvePoint(path.c,path.t0+(path.t1-path.t0)*i/1024));
      }
    }
    sections.push({stream:survey.stream,offset:item.offset,kind:item.kind,bodies:parsed.nodes.filter(n=>n.type===12).length,
      faces:parsed.nodes.filter(n=>n.type===14).length,points:points.length,pointBox:box(points),parseError:parsed.error});
  }
}
const config=source.configurations[0],outsideDisplay=config.min.some((x,k)=>x<displayBox.min[k])||config.max.some((x,k)=>x>displayBox.max[k]);
const parsedBoxes=sections.map(s=>s.pointBox).filter(Boolean),allSectionPointsBox=box(parsedBoxes.flatMap(b=>[b.min,b.max]));
const reachesEnvelope=parsedBoxes.some(b=>config.min.every((x,k)=>b.min[k]<=x)&&config.max.every((x,k)=>b.max[k]>=x));
const result={summary:{file:source.file,configuration:{name:config.name,min:config.min,max:config.max},displayBox,outsideDisplay,
  sections:sections.length,readableSections:sections.filter(s=>!s.parseError&&!s.frameError).length,allSectionPointsBox,reachesEnvelope,
  sampledEdgePoints:edgeSamples.length,sampledEdgeBox:box(edgeSamples)},sections};
fs.writeFileSync(path.join(__dirname,'configuration-outlier.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
