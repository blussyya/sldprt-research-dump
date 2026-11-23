'use strict';
const fs=require('fs'),path=require('path');
const PKG='/home/user/dump-validation/package';
const display=require(path.join(PKG,'src/display.js'));
const {inflateRaw,inflateZlib}=require(path.join(PKG,'src/index.js'));
const partition=require(path.join(PKG,'src/parasolid/partition.js'));
const file=process.argv[2];
const buf=fs.readFileSync(file);
const r=display.parseSLDPRT(buf,inflateRaw,inflateZlib);
for(const f of r.faces){
  if(!f.metadata)continue;
  const sa=f.metadata.scalarArrays;
  console.log('face rawId',f.metadata.rawId,'typeTag',f.metadata.typeTag,'params',f.metadata.parameters.map(x=>+x.toPrecision(6)),'dir',f.metadata.direction.map(x=>+x.toFixed(6)),'nv',f.vertexCount,'scalars',sa.length);
  if(sa.length===2){
    for(let i=0;i<Math.min(6,f.vertexCount);i++)console.log('  v',f.vertices.slice(i*3,i*3+3).map(x=>x.toExponential(8)).join(' '),' A',sa[0].values[i],' B',sa[1].values[i]);
  }
  console.log('  bounds',f.bounds&&{min:f.bounds.min,max:f.bounds.max});
}
const p=partition.readBody(buf,{});
console.log('parsed error',p.parsed.error,'nodes',p.parsed.nodes.length);
const surfs=p.parsed.nodes.filter(n=>/CONE|SPHERE|CYLINDER|TORUS|B_SURFACE|PLANE|SWEPT|BLENDED/.test(n.name));
for(const s of surfs)console.log('SURF',s.index,s.name,JSON.stringify(s.values).slice(0,400));
const faces=p.parsed.nodes.filter(n=>n.type===14);
for(const f of faces.slice(0,40))console.log('FACE',f.index,f.values.node_id,'surface',f.values.surface,'sense',f.values.sense);
