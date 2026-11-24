// for the off-chord vertices of a part: nearest edge curve among ALL native edges (not just the face's), and the
// plane/surface distances of every face containing the vertex within 1e-6.
const L=require('./lib.js');const name=process.argv[2],th=+process.argv[3]||3e-8,lo=+process.argv[4]||1e-7;
const {d,N,j}=L.load(L.PARTS[name]||name);
const rs=require('fs').readFileSync('/tmp/claude-0/'+name+'_off.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.boundary&&r.chord>th);
const edges=[...N.edges.values()];const seen=new Set();
for(const r of rs){const f=d.faces[r.fi],p=L.vtx(f,r.k);const key=p.join(',');if(seen.has(key))continue;seen.add(key);
  const ds=[];let skipped=0;for(const e of edges){const x=L.curveDist(e,p);if(x===null){skipped++;continue;}ds.push([x,e.id,e.curve.type,e.tolerance]);}
  ds.sort((a,b)=>a[0]-b[0]);
  // faces whose analytic surface passes within 1e-8
  const fs=[];for(const nf of N.faces){const x=L.DJ.residual(nf.surface,p);if(x!==null&&!isNaN(x)&&Math.abs(x)<1e-8)fs.push(nf.displayId+':'+nf.surface.type);}
  console.log(name,'face',r.face,'k',r.k,'res',r.res.toExponential(2),'chord',r.chord.toExponential(1),'| nearest curves',ds.slice(0,3).map(a=>a[1]+'/'+a[2]+'/'+a[0].toExponential(1)).join(' ; '),'skippedInt',skipped,'| faces within 1e-8:',fs.slice(0,6).join(','));}
