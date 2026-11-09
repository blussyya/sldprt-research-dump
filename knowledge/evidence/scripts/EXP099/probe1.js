const S=require('/home/user/conv-dev/src'),N=S.brep.model;const fs=require('fs');
for(const f of ['/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT','/home/user/sldprt-research-dump/test files online/2024/a4ecc6f5_PP-2074-08.SLDPRT']){
 const d=S.parse(f),r=S.readBrep(f),p=r.parsed;
 console.log(f.split('/').pop(),r.configuration,'hidden',p.hidden,'display faces',d.faces.length);
 const faces=p.nodes.filter(n=>n.type===14);
 const byNid={};faces.forEach(n=>(byNid[n.values.node_id]=byNid[n.values.node_id]||[]).push(n));
 console.log('parasolid face nodes',faces.length,'dup node_ids',Object.entries(byNid).filter(([k,v])=>v.length>1).map(([k,v])=>k+':'+v.length));
 const bodies=p.nodes.filter(n=>n.type===12);console.log('bodies',bodies.map(b=>({idx:b.index,type:b.values.body_type,hi:b.values.highest_node_id})));
 const nat=N(p);console.log('native faces',nat.faces.length,'bodies',nat.bodies.length);
 const ids=d.faces.map(x=>x.metadata.rawId);
 const cnt={};ids.forEach(i=>cnt[i]=(cnt[i]||0)+1);
 console.log('display dup ids',Object.entries(cnt).filter(([k,v])=>v>1));
 for(const [k] of Object.entries(cnt).filter(([k,v])=>v>1)){
   console.log(' id',k,'parasolid faces w/ that node_id',(byNid[k]||[]).map(n=>({idx:n.index,surf:p.nodes.find(m=>m.index===n.values.surface).name,shell:n.values.shell, body:p.nodes.find(m=>m.index===n.values.shell)?.values.body})),
   'display',d.faces.map((x,i)=>[i,x.metadata.rawId,x.metadata.typeTag,x.vertexCount,x.offset]).filter(a=>a[1]==k));
 }
}
