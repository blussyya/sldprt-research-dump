// Attributes on a native face and its edges: definition name and field values, looking for
// integers equal to the display ids (e.g. 12991 for face 12990, 11112 for edge 11111).
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const want=(process.argv[3]||'12990,11111,11124,11135,2516,1165,1166,1093').split(',').map(Number);
const q=S.readBrep(fs.readFileSync(file)).parsed,by=new Map(q.nodes.map(n=>[n.index,n]));
const name=d=>{const n=by.get(d)&&by.get(by.get(d).values.identifier);if(!n)return '?';const v=n.values.string;return Array.isArray(v)?v.join(''):v;};
const idx=new Map();for(const n of q.nodes)if(n.values&&typeof n.values.node_id==='number'&&(n.type===14||n.type===16))idx.set(n.values.node_id,n);
for(const id of want){const n=idx.get(id);if(!n){console.log(id,'none');continue;}
  const atts=q.nodes.filter(a=>a.type===81&&a.values.owner===n.index);
  console.log(n.name,id,'attributes',atts.length);
  for(const a of atts){const vals=(a.values.fields||[]).map(i=>by.get(i)).filter(Boolean).map(f=>f.name+':'+JSON.stringify(f.values.values!==undefined?f.values.values:f.values.string).slice(0,80));console.log('   ',name(a.values.definition),vals.join(' '));}}
