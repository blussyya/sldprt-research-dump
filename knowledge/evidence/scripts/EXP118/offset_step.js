// EXP-118: where the offset steps from 0 to 1, and what native entities have ids near the step.
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),br=S.readBrep(buf),M=N.build(br.parsed);
const rows=JSON.parse(fs.readFileSync(__dirname+'/offset.json')).filter(r=>r.hits.length===1).sort((a,b)=>a.lab-b.lab);
const z=rows.filter(r=>r.hits[0]===0).map(r=>r.lab),o=rows.filter(r=>r.hits[0]===1).map(r=>r.lab);
console.log('offset 0 labels',z[0],'..',z[z.length-1],' offset 1 labels',o[0],'..',o[o.length-1]);
console.log('offset-0 labels above',o[0],':',z.filter(x=>x>o[0]).join(','),' offset-1 labels below',z[z.length-1],':',o.filter(x=>x<z[z.length-1]).join(','));
const lo=z.filter(x=>x<o[0]).pop(),hi=o[0];
console.log('step lies between label',lo,'(offset 0) and',hi,'(offset 1)');
// every native entity carrying a node id in that window
const ents=br.parsed.entities||br.parsed.nodes||[];
const near=[];for(const e of (Array.isArray(ents)?ents:[...ents.values()])){const v=e.values||{};for(const k of ['node_id','section_node_id'])if(typeof v[k]==='number'&&v[k]>=lo-3&&v[k]<=hi+3)near.push(`${e.type||e.typeName} ${k}=${v[k]}`);}
console.log('native entities with ids in',lo-3,'..',hi+3,':\n  '+near.sort((a,b)=>+a.split('=')[1]-+b.split('=')[1]).join('\n  '));
// gaps and duplicates in edge+face display ids over the whole part
const ids=[...[...M.edges.values()].map(e=>e.displayId),...M.faces.map(f=>f.displayId)].sort((a,b)=>a-b);
const dup=ids.filter((x,i)=>i&&x===ids[i-1]);console.log('edge+face ids',ids.length,'range',ids[0],ids[ids.length-1],'duplicates',dup.length,dup.slice(0,10).join(','));
