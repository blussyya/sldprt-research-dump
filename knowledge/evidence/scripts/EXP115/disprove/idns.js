const {S,files}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const p=files().find(x=>x.includes('0132519a'));const d=S.parse(p);const r=S.readBrep(p);const M=S.brep.model(r.parsed);const j=J.join(d.faces,M);
for(const i of [4,34]){const nf=j[i].face;console.log('display face',i,'meta rawId',d.faces[i].metadata.rawId,'native id',nf.id,'displayId',nf.displayId,j[i].how,j[i].candidates);
 console.log(' display ids',[...new Set(d.faces[i].edgeAnnotations.map(e=>e.id).filter(x=>x))].join(','));
 console.log(' native edges',nf.loops.map(l=>l.coedges.map(c=>{const e=M.edges.get(c.edge);return c.edge+'/'+e.displayId;}).join(' ')).join(' # '));
 console.log(' meta edge records',d.faces[i].metadata.edgeRecords.map(e=>e.id).join(','));}
const dup={};for(const e of M.edges.values())dup[e.displayId]=(dup[e.displayId]||0)+1;console.log('edges',M.edges.size,'distinct displayIds',Object.keys(dup).length,'bodies',M.bodies.length);
const by=new Map();for(const e of M.edges.values())by.set(e.displayId,e.id);
console.log('6722 in native edges?',by.has(6722),'6406?',by.has(6406));
const raw=r.parsed.nodes.filter(n=>n.type===16);console.log('raw edge nodes',raw.length,'hidden',[...(r.parsed.hidden||[])].length);
const hit=raw.filter(n=>n.values&&(n.values.node_id===6722||n.values.section_node_id===6722||n.values.node_id===6406||n.values.section_node_id===6406)).map(n=>({idx:n.index,node_id:n.values.node_id,sec:n.values.section_node_id,owner:n.values.owner}));
console.log(hit);
console.log('edge node value keys',Object.keys(raw[0].values));
