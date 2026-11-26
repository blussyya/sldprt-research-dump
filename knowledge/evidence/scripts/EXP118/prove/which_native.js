// For display faces 75 and 448 (and any given), find by geometry alone which native faces' surfaces
// carry all their vertices, and which native edges carry each labelled group of boundary segments.
// Face 75 is the control: its ids are expected to name the edges found.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
const list=(process.argv[2]||'75,448').split(',').map(Number);
function edgeDist(p,e){let c=e.curve;if(c.type==='trimmed')c=c.basis;
  if(c.type==='line')return G.distLine(p,c);if(c.type==='circle')return G.distCircle(p,c);
  if(c.type==='intersection'){const pl=G.distPolyline(p,c.chart);return pl<=c.chordalError?pl:Infinity;}
  return Infinity;}
for(const fi of list){const f=faces[fi],M=L.meshEdges(f);
  const surf=[];for(const nf of m.faces){let mx=0;for(const p of f.pos){const d=G.distSurface(p,nf.surface);if(d===null){mx=null;break;}mx=Math.max(mx,d);if(mx>1e-4)break;}
    if(mx!==null&&mx<1e-5)surf.push({face:nf.id,type:nf.surface.type,max:mx,loops:nf.loops.map(l=>l.coedges.map(c=>c.edge+(c.sense?'+':'-')).join(' '))});}
  console.log('display face',fi,'native faces whose surface holds every vertex (<1e-5 m):',JSON.stringify(surf));
  const byId={};for(const e of M.boundary)for(const id of new Set(e.ids))if(id)(byId[id]=byId[id]||[]).push(e);
  for(const id in byId){const pts=byId[id].flatMap(s=>[L.P(s.a),L.P(s.b)]);
    const hits=[];for(const e of m.edges.values()){let mx=0;for(const p of pts){mx=Math.max(mx,edgeDist(p,e));if(!(mx<1e-4))break;}
      if(mx<1e-4)hits.push({edge:e.id,type:e.curve.type,max:+mx.toExponential(2)});}
    hits.sort((a,b)=>a.max-b.max);
    console.log('  label',id,'segs',byId[id].length,'native edges holding all its vertices:',JSON.stringify(hits.slice(0,4)));}
}
