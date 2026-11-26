// Whole file f666f342: each labelled group of display boundary segments (one face, one id) tested
// against the native edge with the same id (offset 0) and the native edge with id - 1 (offset 1).
// "carries": line/circle every vertex <= 1e-6 m from the curve; intersection every vertex within the
// chart's chordal error of the chart polyline; other curve types not tested. Edge extent not used.
const L=require('./lib'),G=require('./geo');
const native=require('/home/user/solidworks-converters/src/brep/native');
const F=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const {dl}=L.dlBytes(F);const conv=L.S.parse(F);const m=native.build(L.S.readBrep(F).parsed);
const faces=conv.faces.map(f=>L.readFace(dl,f.offset));
function carries(e,pts){if(!e)return 'missing';let c=e.curve;if(c.type==='trimmed')c=c.basis;let mx=0;
  if(c.type==='line'){for(const p of pts)mx=Math.max(mx,G.distLine(p,c));return mx<=1e-6;}
  if(c.type==='circle'){for(const p of pts)mx=Math.max(mx,G.distCircle(p,c));return mx<=1e-6;}
  if(c.type==='intersection'){for(const p of pts)mx=Math.max(mx,G.distPolyline(p,c.chart));return mx<=c.chordalError;}
  return 'untested';}
const tally={},faceClass=[];
faces.forEach((f,fi)=>{const M=L.meshEdges(f);const byId={};for(const e of M.boundary)for(const id of new Set(e.ids))if(id)(byId[id]=byId[id]||[]).push(e);
  const cls={};
  for(const id in byId){const pts=byId[id].flatMap(s=>[L.P(s.a),L.P(s.b)]);
    const a=carries(m.edges.get(+id),pts),b=carries(m.edges.get(+id-1),pts);
    const k=a==='untested'?'untested':a===true&&b===true?'both':a===true?'0':b===true?'1':'neither';
    tally[k]=(tally[k]||0)+1;cls[k]=(cls[k]||0)+1;}
  faceClass.push(cls);});
console.log(JSON.stringify({file:F.split('/').pop(),groups:tally}));
// faces by class: all tested groups offset 0 / all offset 1 / mixed
const summary={},ranges={};faceClass.forEach((c,i)=>{const k=(c['0']?'0':'')+(c['1']?'1':'')+(c.neither?'N':'')||'none';summary[k]=(summary[k]||0)+1;(ranges[k]=ranges[k]||[]).push(i);});
console.log('faces by which offsets their tested groups need (0, 1, N = neither):',summary);
const comp=a=>{const r=[];for(const v of a){if(r.length&&r[r.length-1][1]===v-1)r[r.length-1][1]=v;else r.push([v,v]);}return r.map(x=>x[0]===x[1]?x[0]:x[0]+'-'+x[1]).join(',');};
for(const k in ranges)console.log(' ',k,':',comp(ranges[k]).slice(0,600));
console.log('face 75',JSON.stringify(faceClass[75]),'face 448',JSON.stringify(faceClass[448]));
