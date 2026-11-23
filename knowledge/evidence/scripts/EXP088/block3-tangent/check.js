'use strict';

// Independent check of whether Block3 edge bytes track smooth/tangent or open edges.
// The comparison is deliberately limited to display faces that join the selected native body
// by face ID, and to edge labels that occur in that native face's own loops.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../../..');
const S=require(path.join(root,'../solidworks-converters/src'));

function filesBelow(dir,out=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())filesBelow(file,out);
    else if(/\.sldprt$/i.test(entry.name))out.push(file);
  }
  return out;
}
function pointKey(values,i){return `${values[3*i]},${values[3*i+1]},${values[3*i+2]}`;}
function normalAt(values,i){return [values[3*i],values[3*i+1],values[3*i+2]];}
function angle(a,b){
  const dot=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
  return Math.acos(dot);
}
function quantile(a,q){
  if(!a.length)return null;
  const b=a.slice().sort((x,y)=>x-y),p=(b.length-1)*q,i=Math.floor(p),f=p-i;
  return b[i]+(b[Math.min(i+1,b.length-1)]-b[i])*f;
}
function summarizeAngles(rows){
  const a=rows.map(r=>r.maxAngle);
  return {edges:a.length,min:Math.min(...a),q50:quantile(a,.5),q95:quantile(a,.95),max:Math.max(...a),
    under1e3:a.filter(x=>x<1e-3).length,under1e2:a.filter(x=>x<1e-2).length,over5e2:a.filter(x=>x>5e-2).length};
}

const result={method:{normalJoin:'exact shared float32 display vertex coordinates',faceJoin:'display metadata rawId to selected native face id'},files:[],twoSided:[],open:[]};
for(const file of filesBelow(path.join(root,'test files online')).sort()){
  const rel=path.relative(root,file),status={file:rel};result.files.push(status);
  try{
    const display=S.parse(file);
    if(!display.faces.some(f=>f.block3&&f.block3.some(x=>x!==0))){status.noNonzero=true;continue;}
    status.nonzero=true;
    const native=S.brep.model(S.readBrep(file).parsed);
    const nativeFaces=new Map(),duplicateFaceIds=[];
    for(const face of native.faces){if(nativeFaces.has(face.id))duplicateFaceIds.push(face.id);nativeFaces.set(face.id,face);}
    status.duplicateNativeFaceIds=duplicateFaceIds;
    const owners=new Map();
    for(const face of native.faces)for(const loop of face.loops)for(const coedge of loop.coedges){
      const set=owners.get(coedge.edge)||new Set();set.add(face.id);owners.set(coedge.edge,set);
    }
    const uses=new Map();
    for(const [displayIndex,face] of display.faces.entries()){
      const nativeFace=nativeFaces.get(face.metadata&&face.metadata.rawId);
      if(!nativeFace){status.unmatchedFaces=(status.unmatchedFaces||0)+1;continue;}
      const faceEdges=new Set(nativeFace.loops.flatMap(loop=>loop.coedges.map(c=>c.edge)));
      for(const annotation of face.edgeAnnotations){
        if(!annotation.id)continue;
        const token=(annotation.tokenOffset-face.offsets.block1-16)/4,flag=face.block3[token];
        if(!faceEdges.has(annotation.id)){status.unmatchedEdgeUses=(status.unmatchedEdgeUses||0)+1;continue;}
        const edgeUses=uses.get(annotation.id)||new Map();
        const side=edgeUses.get(nativeFace.id)||{displayIndex,nativeFace:nativeFace.id,flags:new Set(),points:new Map(),segments:0};
        side.flags.add(flag);side.segments++;
        for(const vertex of annotation.vertices)side.points.set(pointKey(face.vertices,vertex),normalAt(face.normals,vertex));
        edgeUses.set(nativeFace.id,side);uses.set(annotation.id,edgeUses);
      }
    }
    for(const [edge,faceUses] of uses){
      const ownerIds=owners.get(edge)||new Set(),sides=[...faceUses.values()];
      if(ownerIds.size===1){
        result.open.push({file:rel,edge,owners:[...ownerIds],faces:sides.map(s=>s.nativeFace),flags:[...new Set(sides.flatMap(s=>[...s.flags]))].sort(),segments:sides.reduce((n,s)=>n+s.segments,0)});
        continue;
      }
      if(ownerIds.size!==2||sides.length!==2)continue;
      const [a,b]=sides,angles=[];
      for(const [key,n] of a.points)if(b.points.has(key))angles.push(angle(n,b.points.get(key)));
      if(!angles.length){status.twoSidedWithoutSharedPoint=(status.twoSidedWithoutSharedPoint||0)+1;continue;}
      result.twoSided.push({file:rel,edge,owners:[...ownerIds],faces:[a.nativeFace,b.nativeFace],
        flags:[[...a.flags].sort(),[...b.flags].sort()],sharedPoints:angles.length,
        minAngle:Math.min(...angles),maxAngle:Math.max(...angles),medianAngle:quantile(angles,.5)});
    }
  }catch(error){status.error=error.message;}
}

const pattern=row=>row.flags.map(a=>a.join('+')).sort().join('|');
const patterns={};
for(const row of result.twoSided){const key=pattern(row);(patterns[key]||(patterns[key]=[])).push(row);}
result.summary={
  filesScanned:result.files.length,
  filesWithNonzero:result.files.filter(f=>f.nonzero).length,
  errors:result.files.filter(f=>f.error),
  unmatchedFaces:result.files.reduce((n,f)=>n+(f.unmatchedFaces||0),0),
  unmatchedEdgeUses:result.files.reduce((n,f)=>n+(f.unmatchedEdgeUses||0),0),
  twoSidedEdges:result.twoSided.length,
  twoSidedByFlag:Object.fromEntries(Object.entries(patterns).map(([key,rows])=>[key,summarizeAngles(rows)])),
  openEdges:result.open.length,
  openByFlag:result.open.reduce((out,row)=>{const key=row.flags.join('+');out[key]=(out[key]||0)+1;return out;},{}),
  byte2WithTwoNativeOwners:result.twoSided.filter(row=>row.flags.flat().includes(2)).length,
  byte2WithOneNativeOwner:result.open.filter(row=>row.flags.includes(2)).length,
  byte1SharpExamples:result.twoSided.filter(row=>row.flags.flat().includes(1)&&row.maxAngle>.05).slice(0,20),
  byte0TangentExamples:result.twoSided.filter(row=>row.flags.flat().every(x=>x===0)&&row.maxAngle<1e-3).slice(0,20),
  mixedExamples:result.twoSided.filter(row=>pattern(row)==='0|1').slice(0,20)
};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
