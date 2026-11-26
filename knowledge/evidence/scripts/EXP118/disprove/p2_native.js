// Read f666f342's native body (no resolve), find the native faces whose loops use the display
// faces' labelled ids, print their loops with edge curve types and vertices.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const buf=fs.readFileSync(file);
let t0=Date.now();const rb=S.readBrep(buf);console.log('readBrep',Date.now()-t0,'ms source',rb.source,rb.kind,'nodes',rb.parsed.nodes.length,'err',rb.parsed.error,'hidden',(rb.parsed.hidden||[]).length,'config',JSON.stringify(rb.configuration),'partitions',JSON.stringify(rb.partitions));
t0=Date.now();const M=N.build(rb.parsed);console.log('build',Date.now()-t0,'ms faces',M.faces.length,'edges',M.edges.size,'vertices',M.vertices.size,'bodies',M.bodies.length,M.bodies.map(b=>b.type).join(','));
let nd=0;for(const e of M.edges.values())if(e.displayId!==e.id)nd++;console.log('edges with displayId!=id',nd);
let fd=0;for(const f of M.faces)if(f.displayId!==f.id)fd++;console.log('faces with displayId!=id',fd);
const want=(process.argv[3]||'1093,1165,1166,11112,11125,11136').split(',').map(Number);
const cdesc=c=>c.type==='trimmed'?'trimmed('+c.basis.type+')':c.type;
for(const f of M.faces){const ids=f.loops.flatMap(l=>l.coedges.map(c=>c.edge));if(!ids.some(i=>want.includes(i)))continue;
  console.log('native face',f.id,'disp',f.displayId,f.surface.type,f.surface.r!==undefined?'r='+f.surface.r:'','sameSense',f.sameSense,'loops',f.loops.length);
  for(const l of f.loops)console.log('  loop:',l.coedges.map(c=>{const e=M.edges.get(c.edge);return c.edge+(c.sense?'+':'-')+'['+cdesc(e.curve)+' v'+(e.v?e.v.join('>'):'ring')+']';}).join('  '));
}
