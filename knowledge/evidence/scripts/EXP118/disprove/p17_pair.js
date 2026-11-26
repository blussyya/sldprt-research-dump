// Edges between one vertex pair: show every native edge joining the two end vertices of a display id,
// with curve, centre, radius, sense, arc span, faces; and the display id's faces.
const L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),B=require('./branch'),fs=require('fs');
const file=process.argv[2];const ids=process.argv[3].split(',').map(Number);
const buf=fs.readFileSync(file),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed);
for(const id of ids){const e=M.edges.get(id);if(!e){console.log(id,'none');continue;}const c=e.curve.type==='trimmed'?e.curve.basis:e.curve;
  const br=B.branch(M,e,false);let len=0;if(br)for(let i=1;i<br.length;i++)len+=G.dist(br[i-1],br[i]);
  console.log('native',id,e.curve.type,c.type,'c',c.c&&c.c.map(x=>x.toFixed(6)),'r',c.r,'v',e.v,'same',e.sameSense,'len mm',(len*1000).toFixed(4),'faces',M.faces.filter(x=>x.loops.some(l=>l.coedges.some(k=>k.edge===id))).map(x=>x.id+':'+x.surface.type).join(','));}
const df=[];d.faces.forEach((f,i)=>{if(f.edgeAnnotations.some(a=>ids.includes(a.id)))df.push(i+':'+[...new Set(f.edgeAnnotations.map(a=>a.id).filter(x=>ids.includes(x)))].join('/'));});console.log('display faces',df.join(' '));
