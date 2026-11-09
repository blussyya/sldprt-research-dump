const S=require('/home/user/conv-dev/src');
const f='/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT';
const d=S.parse(f),r=S.readBrep(f),p=r.parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
const bodyOfFace=n=>m.get(n.values.shell).values.body;
const faces=p.nodes.filter(n=>n.type===14);
const per={};faces.forEach(n=>{const b=bodyOfFace(n);(per[b]=per[b]||[]).push(n);});
for(const b in per)console.log('body',b,'faces',per[b].length,'node_id range',Math.min(...per[b].map(n=>n.values.node_id)),Math.max(...per[b].map(n=>n.values.node_id)));
const dispIds=new Set(d.faces.map(x=>x.metadata.rawId));
for(const b in per){const ids=new Set(per[b].map(n=>n.values.node_id));console.log('body',b,'display ids hit',[...dispIds].filter(i=>ids.has(i)).length,'of',ids.size);}
console.log('display last 24:');d.faces.slice(936).forEach((x,i)=>console.log(936+i,x.metadata.rawId,x.metadata.typeTag,x.vertexCount, faces.find(n=>n.values.node_id===x.metadata.rawId)?m.get(faces.find(n=>n.values.node_id===x.metadata.rawId).values.surface).name+'/body'+bodyOfFace(faces.find(n=>n.values.node_id===x.metadata.rawId)):'-'));
console.log('body2 faces (idx 44493) sample', per[44493].slice(0,5).map(n=>[n.values.node_id,m.get(n.values.surface).name]));
