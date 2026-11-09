const S=require('/home/user/conv-dev/src');
const TAG={PLANE:4001,CYLINDER:4002,CONE:4003,SPHERE:4004,TORUS:4005,B_SURFACE:4006,SWEPT_SURF:4007,OFFSET_SURF:4008,BLEND_BOUND:4009,SPUN_SURF:4010};
for(const f of ['2023/2f121983_case.SLDPRT','2024/a4ecc6f5_PP-2074-08.SLDPRT']){
 const d=S.parse('/home/user/sldprt-research-dump/test files online/'+f),p=S.readBrep('/home/user/sldprt-research-dump/test files online/'+f).parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
 const bodies=p.nodes.filter(n=>n.type===12).map(b=>({idx:b.index,hi:b.values.highest_node_id}));
 const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,surf:m.get(n.values.surface).name,body:m.get(n.values.shell).values.body,order:n.index}));
 console.log(f,JSON.stringify(bodies));
 for(const b of bodies){const fs=faces.filter(x=>x.body===b.idx);console.log(' body',b.idx,'faces',fs.length,'nid',Math.min(...fs.map(x=>x.nid)),'..',Math.max(...fs.map(x=>x.nid)));}
 // the display faces in order vs. native faces in order
 const nat=faces; console.log(' display order vs native order: first mismatch');
 let first=-1;for(let i=0;i<d.faces.length;i++){if(d.faces[i].metadata.rawId!==nat[i].nid){first=i;break;}}console.log(' first index where display rawId != native node_id in file order:',first);
 const tail=d.faces.slice(first).map((x,k)=>({i:first+k,raw:x.metadata.rawId,tag:x.metadata.typeTag,nat:nat[first+k].nid,natTag:TAG[nat[first+k].surf],diff:nat[first+k].nid-x.metadata.rawId,body:nat[first+k].body}));
 console.log(JSON.stringify(tail.map(t=>[t.i,t.raw,t.nat,t.diff,t.tag===t.natTag?'tag=':'TAG!='])));
}
