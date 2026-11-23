// EXP-103: list blend nodes whose spine is an intersection of the given two surface nodes.  node findblend.js part nodeA nodeB
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native');
const n=N.build(S.readBrep(process.argv[2]).parsed),seen=new Set();
for(const f of n.faces){const s=f.surface;if(s.type!=='blend'||seen.has(s.node))continue;seen.add(s.node);let c=s.spine;if(c&&c.type==='trimmed')c=c.basis;
 if(c&&c.surfaces&&c.surfaces.map(x=>x.node).sort().join()===[+process.argv[3],+process.argv[4]].sort().join())console.log('blend',s.node,'r',s.range,'face',f.id);}
