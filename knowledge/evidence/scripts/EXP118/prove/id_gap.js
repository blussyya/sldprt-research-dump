// Background for the display-id offset on face 448: the native node_id sequence of f666f342's body
// (gaps, duplicates), and the native edge ids at which the display labels switch from offset 0 to 1.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const r=L.S.readBrep(F);const ids=r.parsed.nodes.map(n=>n.values&&n.values.node_id).filter(x=>typeof x==='number');
const set=new Set(ids);const max=Math.max(...ids);const gaps=[];for(let i=1;i<=max;i++)if(!set.has(i))gaps.push(i);
console.log('nodes with node_id',ids.length,'distinct',set.size,'max',max,'missing ids in 1..max',gaps.length,'first missing',gaps.slice(0,20).join(','));
const body=r.parsed.nodes.find(n=>n.type===12);console.log('body highest_node_id',body&&body.values.highest_node_id);
const m=native.build(r.parsed);
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
let max0=0,min1=Infinity;const off1=[],off0=[];
faces.forEach((f,fi)=>{const M=L.meshEdges(f);const byId={};for(const e of M.boundary)for(const id of new Set(e.ids))if(id)(byId[id]=byId[id]||[]).push(e);
  for(const id in byId){const pts=byId[id].flatMap(s=>[L.P(s.a),L.P(s.b)]);const ok=e=>{if(!e)return false;let c=e.curve;if(c.type==='trimmed')c=c.basis;if(c.type==='line')return pts.every(p=>G.distLine(p,c)<=1e-6);if(c.type==='circle')return pts.every(p=>G.distCircle(p,c)<=1e-6);return false;};
    const a=ok(m.edges.get(+id)),b=ok(m.edges.get(+id-1));if(a&&!b)off0.push(+id);if(b&&!a)off1.push(+id-1);}});
off0.sort((a,b)=>a-b);off1.sort((a,b)=>a-b);
console.log('line/circle groups at offset 0:',off0.length,'native ids',off0[0],'..',off0[off0.length-1],'| at offset 1:',off1.length,'native ids',off1[0],'..',off1[off1.length-1]);
const overlap=off1.filter(x=>x<=off0[off0.length-1]).length;console.log('offset-1 native ids not above every offset-0 id:',overlap, 'offset-0 ids above the lowest offset-1 id:',off0.filter(x=>x>=off1[0]).length);
