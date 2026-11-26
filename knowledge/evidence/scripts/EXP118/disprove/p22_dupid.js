// Native node_id sanity: duplicates, the body's highest_node_id, and the id ranges by node type
// around the shifted range (10898-11961 edges in f666f342).
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const q=S.readBrep(fs.readFileSync(file)).parsed;
const w=q.nodes.filter(n=>n.values&&typeof n.values.node_id==='number'),m=new Map();for(const n of w){if(!m.has(n.values.node_id))m.set(n.values.node_id,[]);m.get(n.values.node_id).push(n.name+'#'+n.index);}
console.log('duplicates',[...m].filter(([k,v])=>v.length>1).map(([k,v])=>k+':'+v.join(',')).join(' '));
for(const b of q.nodes.filter(n=>n.type===12))console.log('BODY highest_node_id',b.values.highest_node_id,'max node_id',Math.max(...m.keys()));
// which ids are unused between 9000 and 11000
const used=new Set(m.keys());let gaps=[];let s=null;for(let i=8900;i<=11000;i++){if(!used.has(i)){if(s===null)s=i;}else if(s!==null){gaps.push(s+'-'+(i-1));s=null;}}console.log('unused ids 8900-11000:',gaps.join(' '));
const types={};for(const [k,v] of m)if(k>=9000&&k<=11000)for(const t of v){const nm=t.split('#')[0];types[nm]=(types[nm]||0)+1;}console.log('types in 9000-11000',JSON.stringify(types));
