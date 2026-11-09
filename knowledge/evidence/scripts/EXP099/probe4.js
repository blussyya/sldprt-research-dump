const S=require('/home/user/conv-dev/src');
const TAG={PLANE:4001,CYLINDER:4002,CONE:4003,SPHERE:4004,TORUS:4005,B_SURFACE:4006,SWEPT_SURF:4007,OFFSET_SURF:4008,BLEND_BOUND:4009,SPUN_SURF:4010};
const f='/home/user/sldprt-research-dump/test files online/2023/2f121983_case.SLDPRT';
const d=S.parse(f),p=S.readBrep(f).parsed,m=new Map(p.nodes.map(n=>[n.index,n]));
const faces=p.nodes.filter(n=>n.type===14).map(n=>({nid:n.values.node_id,surf:m.get(n.values.surface).name,body:m.get(n.values.shell).values.body}));
const un=[];
d.faces.forEach((x,i)=>{const id=x.metadata.rawId,t=x.metadata.typeTag;const c=faces.filter(n=>n.nid===id);if(!c.some(n=>TAG[n.surf]===t))un.push([i,id,t,x.vertexCount,c.map(n=>n.surf+'/b'+n.body).join('|')]);});
console.log(un.length);un.forEach(u=>console.log(JSON.stringify(u)));
const hist={};faces.forEach(n=>hist[n.surf]=(hist[n.surf]||0)+1);console.log(hist);
