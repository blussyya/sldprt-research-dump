// Which native nodes carry the node_ids near the display ids of face 448 and face 75?
// If a display id that doesn't match the right edge equals the node_id of that edge's curve or
// another related node, the "shift" is a different entity, not a renumbering.
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const lo=+(process.argv[3]||11108),hi=+(process.argv[4]||11140);
const q=S.readBrep(fs.readFileSync(file)).parsed;const by=new Map(q.nodes.map(n=>[n.index,n]));
const withId=q.nodes.filter(n=>n.values&&typeof n.values.node_id==='number');
const hist={};for(const n of withId)hist[n.name]=(hist[n.name]||0)+1;console.log('node types with node_id',JSON.stringify(hist));
// uniqueness of node_id across all types
const cnt=new Map();for(const n of withId)cnt.set(n.values.node_id,(cnt.get(n.values.node_id)||0)+1);console.log('node_ids used more than once',[...cnt.values()].filter(x=>x>1).length,'max',Math.max(...cnt.keys()));
for(const n of withId.filter(n=>n.values.node_id>=lo&&n.values.node_id<=hi).sort((a,b)=>a.values.node_id-b.values.node_id)){
  let extra='';if(n.name==='EDGE'){const c=n.values.curve&&by.get(n.values.curve);extra=' curve '+(c?c.name+'#'+c.values.node_id:'none');}
  if(/CURVE|CIRCLE|LINE|INTERSECTION/.test(n.name))extra=' sense '+n.values.sense;
  console.log(n.values.node_id,n.name,extra);}
