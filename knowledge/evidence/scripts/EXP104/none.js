const C=require('./common');const J=require(C.SRC+'/brep/display-join');
for(const pat of ['0132519a','543861c9','a0ab30c8','09d353a9']){
  const f=C.corpusFiles().find(x=>x.includes(pat));const L=C.load(f);
  const r=J.join(L.display,L.M);
  const none=L.display.filter((d,i)=>r[i].how==='none');
  const all14=new Map();for(const n of L.B.parsed.nodes.filter(n=>n.type===14))all14.set(n.values.section_node_id??n.values.node_id,n);
  const hidden=new Set(L.B.parsed.hidden||[]);
  let inAll=0,typeBad=0;for(const d of none){if(all14.has(d.metadata.rawId)){inAll++;}}
  const ids=[...new Set(none.map(d=>d.metadata.rawId))].sort((a,b)=>a-b);
  console.log(pat,'display',L.display.length,'native faces',L.M.faces.length,'all FACE nodes',L.B.parsed.nodes.filter(n=>n.type===14).length,'hidden bodies',hidden.size,'none',none.length,'of which id exists in a FACE node',inAll,'ids',ids.slice(0,8).join(','),'tags',[...new Set(none.map(d=>d.metadata.typeTag))].join(','),'nativeMaxId',Math.max(...L.M.faces.map(f=>f.displayId)));
}
