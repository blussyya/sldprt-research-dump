// For each vertex of head_back's face 10183: distance to each support of blend 10239, and the
// ball centre a vertex on a support implies, checked against the spine's two surfaces.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval'),F=require(R+'/src/brep/fit');
const M=N.build(S.readBrep(process.argv[2]).parsed);let b;for(const f of M.faces.values())if(f.surface&&f.surface.node===10239){b=f.surface;break;}
let c=b.spine;if(c.type==='trimmed')c=c.basis;
console.log('blend supports',b.surfaces.map(s=>s.type+s.node+(s.type==='offset'?' off '+s.d+' of '+s.basis.type+s.basis.node:'')),'range',b.range);
console.log('spine surfs',c.surfaces.map(s=>s.type+s.node+(s.type==='offset'?' off '+s.d+' of '+s.basis.type+s.basis.node:'')+(s.type==='blend'?' blend r '+s.range+' sup '+s.surfaces.map(q=>q.type+q.node):'')));
const sp=F.spineOf(b,1e-8).curve;
const face=[...M.faces.values()].find(f=>f.id===10183),seen=new Set();
for(const l of face.loops)for(const co of l.coedges){const e=M.edges.get(co.edge);let cc=e.curve;if(cc.type==='trimmed')cc=cc.basis;
  console.log('edge',e.id,cc.type,cc.surfaces?cc.surfaces.map(s=>s.type+s.node):'',e.v);
  if(!e.v)continue;for(const v of e.v){if(seen.has(v))continue;seen.add(v);const p=M.vertices.get(v).p;
    const ds=b.surfaces.map(s=>{try{return (F.contact({surfaces:[s]},0,p,new Map()),G.dist(p,F.contact({surfaces:[s]},0,p,new Map())))*1e3}catch(x){return x.message}});
    const ps=G.curveProject(sp,p);console.log(' v',v,'to supports mm',ds,'to spine mm',(G.dist(p,G.curvePoint(sp,ps.t))*1e3).toFixed(4),'t',ps.t);}}
