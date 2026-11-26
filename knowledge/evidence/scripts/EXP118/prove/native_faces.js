// Which native faces use the edges that faces 75 and 448 name, and what those faces, loops,
// edges and vertices are.
const S=require('/home/user/solidworks-converters/src');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const m=native.build(S.readBrep(F).parsed);
let renum=0;for(const [id,e] of m.edges)if(e.displayId!==id)renum++;console.log('edges whose id differs from displayId',renum);
const short=c=>{if(!c)return null;const o={type:c.type};for(const k of ['c','n','x','r','p','a','d','R','angle'])if(c[k]!==undefined)o[k]=c[k];if(c.type==='intersection'){o.surfaces=c.surfaces.map(s=>s.type+'#'+s.node);o.chartPts=c.chart.length;o.start=c.start;o.end=c.end;o.chordal=c.chordalError;}if(c.type==='trimmed'){o.basis=short(c.basis);o.t0=c.t0;o.t1=c.t1;}return o;};
for(const ids of [[1093,1165,1166],[11136,11112,11125]]){
  const fs=m.faces.filter(f=>f.loops.some(l=>l.coedges.some(c=>ids.includes(c.edge))));
  console.log('edges',ids,'used by native faces',fs.map(f=>f.id+'('+f.surface.type+')'));
  for(const f of fs){const allE=f.loops.flatMap(l=>l.coedges.map(c=>c.edge));
    console.log(' face',f.id,'surface',JSON.stringify(short(f.surface)),'sameSense',f.sameSense,'loops',f.loops.map(l=>l.coedges.map(c=>c.edge+(c.sense?'+':'-')).join(' ')), 'all edges in this face are among the named:',allE.every(e=>ids.includes(e)));}
  for(const id of ids){const e=m.edges.get(id);console.log(' edge',id,'v',e.v,e.v?e.v.map(v=>v&&m.vertices.get(v).p):null,'sameSense',e.sameSense,'tol',e.tolerance,'curve',JSON.stringify(short(e.curve)),'pcurves',e.pcurves.length);}
}
