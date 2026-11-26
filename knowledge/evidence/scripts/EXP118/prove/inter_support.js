// Background for claim 1: how far SolidWorks' display vertices on intersection edges sit from the
// edge's analytic support surfaces, over the whole file (groups whose named edge, or id - 1 for the
// shifted half, carries them by the chart test). Distribution of the per-group maximum.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F='/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));const per=[];
faces.forEach((f,fi)=>{const M=L.meshEdges(f);const byId={};for(const e of M.boundary)for(const id of new Set(e.ids))if(id)(byId[id]=byId[id]||[]).push(e);
  for(const id in byId){const pts=[...new Set(byId[id].flatMap(s=>[s.a,s.b]))].map(L.P);
    for(const cand of [+id,+id-1]){const e=m.edges.get(cand);if(!e||e.curve.type!=='intersection')continue;const c=e.curve;
      if(Math.max(...pts.map(p=>G.distPolyline(p,c.chart)))>c.chordalError)continue;
      let mx=0,any=false;for(const s of c.surfaces){if(!['plane','cylinder','cone','sphere','torus'].includes(s.type))continue;any=true;for(const p of pts)mx=Math.max(mx,G.distSurface(p,s));}
      if(any)per.push({fi,id,mx});break;}}});
per.sort((a,b)=>a.mx-b.mx);const q=k=>per[Math.min(per.length-1,Math.floor(k*per.length))].mx.toExponential(2);
console.log('intersection-edge label groups with an analytic support:',per.length,'per-group max distance to it: median',q(0.5),'90%',q(0.9),'max',per[per.length-1].mx.toExponential(2),'| groups over 1e-7:',per.filter(x=>x.mx>1e-7).length,'over 1e-5:',per.filter(x=>x.mx>1e-5).length);
console.log('face 75 / 448 groups:',JSON.stringify(per.filter(x=>x.fi===75||x.fi===448).map(x=>({...x,mx:+x.mx.toExponential(2)}))));
