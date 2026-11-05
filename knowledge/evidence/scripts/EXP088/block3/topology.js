'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../../../..'),S=require(path.join(root,'../solidworks-converters/src'));
const edges=require('./edges.json'),files=[...new Set(edges.map(r=>r.file))],out=[];
for(const file of files){try{const parsed=S.readBrep(path.join(root,file)).parsed,m=new Map(parsed.nodes.map(n=>[n.index,n])),byId=new Map(parsed.nodes.filter(n=>n.name==='EDGE').map(n=>[n.values.node_id,n]));
 for(const row of edges.filter(r=>r.file===file)){
  const n=byId.get(row.id);if(!n){out.push({...row,error:'edge ID not found'});continue;}
  const f=m.get(n.values.fin),o=m.get(f.values.other),face=x=>m.get(m.get(x.values.loop)?.values.face)?.values.node_id;
  out.push({...row,brepFaces:[face(f),face(o)],seam:face(f)!==undefined&&face(f)===face(o),curve:m.get(n.values.curve)?.name});
 }
}catch(e){out.push({file,error:e.message});}}
fs.writeFileSync(path.join(__dirname,'topology.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({errors:out.filter(r=>r.error),byte2:out.filter(r=>r.bytes?.includes(2)),counts:out.reduce((o,r)=>{const k=(r.bytes||[]).sort().join(',')+':seam='+r.seam;o[k]=(o[k]||0)+1;return o;},{})},null,2));
