// Claim 3: match each display edge id to a native edge WITHOUT using ids: by the native vertices at
// the display polyline's ends (within VT), then by the curve the polyline lies on; ring edges by
// which closed native curve the points lie on. Then diff = display id - native id.
// Prints the diff histogram, runs of constant diff in native-id order, unmatched / ambiguous counts,
// display ids that two native edges map to, and the literal check (native edge with the display's id
// has the display polyline's end vertices).
const B=require('./branch'),L=require('./lib'),S=require(L.R+'/src'),N=require(L.R+'/src/brep/native'),G=require(L.R+'/src/geom/eval'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const VT=+(process.argv[3]||1e-6),verbose=process.argv[4]==='v';
const buf=fs.readFileSync(file),d=S.parse(buf);
// SECTION=resolved: use the body embedded in Config-0-ResolvedFeatures instead of the partition
function body(){if(process.env.SECTION!=='resolved')return S.readBrep(buf).parsed;
  const P=require(L.R+'/src/parasolid/partition'),X=require(L.R+'/src/parasolid/xt'),all=P.streams(buf),b=all['Config-0-ResolvedFeatures'];
  const row=P.survey(buf,all,undefined,{allowLargeSections:true}).find(r=>r.stream==='Config-0-ResolvedFeatures');const o=row.sections[0].offset;
  const size=(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;const w=P.sections(b.subarray(0,o+4+size),o,undefined,{allowLargeSections:true});
  console.log('using ResolvedFeatures section at',o);return X.parse(w.out[0].body,true,{allowLargeSections:true});}
const M=N.build(body());
// spatial hash of native vertices
const cell=1e-4,H=new Map(),hk=p=>p.map(x=>Math.floor(x/cell)).join(',');
for(const v of M.vertices.values()){const k=hk(v.p);if(!H.has(k))H.set(k,[]);H.get(k).push(v);}
function nearV(p){const c=p.map(x=>Math.floor(x/cell));let best=null,bd=Infinity;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){for(const v of H.get([c[0]+i,c[1]+j,c[2]+k].join(','))||[]){const dd=G.dist(v.p,p);if(dd<bd){bd=dd;best=v;}}}return {v:best,d:bd};}
// native edges by vertex pair
const byPair=new Map(),rings=[];
for(const e of M.edges.values()){if(!e.v||e.v[0]===null){rings.push(e);continue;}const k=e.v[0]<e.v[1]?e.v[0]+'|'+e.v[1]:e.v[1]+'|'+e.v[0];if(!byPair.has(k))byPair.set(k,[]);byPair.get(k).push(e);}
// polyline sample of a native edge's whole curve (for distance tests)
const samp=new Map();
function curvePts(e){if(samp.has(e.id))return samp.get(e.id);let ps=[];const c=e.curve;
  if(c.type==='intersection')ps=c.chart.map(x=>x.slice(0,3));
  else if(c.type==='line'){ps=null;}
  else{const C=c;let [a,b]=G.curveRange(C.type==='trimmed'?C:C);if(!Number.isFinite(a)){a=-1;b=1;}const n=C.type==='circle'||C.type==='ellipse'||(C.basis&&(C.basis.type==='circle'||C.basis.type==='ellipse'))?720:400;
    const R=(C.type==='trimmed'&&(C.basis.type==='circle'||C.basis.type==='ellipse'))?[0,G.TAU]:[a,b];for(let i=0;i<=n;i++)try{ps.push(G.curvePoint(C,R[0]+(R[1]-R[0])*i/n));}catch(_){}}
  samp.set(e.id,ps);return ps;}
function segDist(p,a,b){const ab=G.sub(b,a),t=Math.max(0,Math.min(1,G.dot(G.sub(p,a),ab)/(G.dot(ab,ab)||1)));return G.dist(p,G.add(a,G.mul(ab,t)));}
const brc=new Map();
function distToEdge(e,p){
  // the edge's own branch, oriented as the reader does (so two arcs of one circle are told apart)
  if(!brc.has(e.id)){let b=null;try{b=B.branch(M,e,false);}catch(_){}brc.set(e.id,b);}
  const b=brc.get(e.id);if(b)return B.polyDist(b,p);
  const c=e.curve;
  if(c.type==='line')return G.dist(p,G.curvePoint(c,G.dot(G.sub(p,c.p),c.d)));
  if(c.type==='circle'||(c.type==='trimmed'&&c.basis.type==='circle'))return G.curveProject(c.type==='trimmed'?c.basis:c,p).d;
  const ps=curvePts(e);let m=Infinity;for(let i=1;i<ps.length;i++)m=Math.min(m,segDist(p,ps[i-1],ps[i]));return m;}
// display edges
const D=new Map();
d.faces.forEach((f,fi)=>{if(f.noEdgeTable)return;const {E}=L.meshEdges(f);const g=new Map();
  for(const [p,e] of E){if(e.uses!==1)continue;const id=e.ids.find(x=>x);if(!id)continue;if(!g.has(id))g.set(id,[]);g.get(id).push(p);}
  for(const [id,segs] of g){const deg=new Map();for(const s of segs)for(const k of s.split('|'))deg.set(k,(deg.get(k)||0)+1);
    const ends=[...deg].filter(([k,n])=>n===1).map(([k])=>L.P(k)),pts=[...deg.keys()].map(L.P),mids=segs.map(s=>{const [a,b]=s.split('|').map(L.P);return G.mul(G.add(a,b),0.5);});
    if(!D.has(id))D.set(id,[]);D.get(id).push({fi,ends,pts,mids});}});
const res=[];let unmatched=0,amb=0,literalOK=0,literalBad=0;const why={};
for(const [id,occ] of D){const o=occ[0];let cands=[],how;
  if(o.ends.length===2){const a=nearV(o.ends[0]),b=nearV(o.ends[1]);if(!(a.d<=VT&&b.d<=VT)){why.endsFar=(why.endsFar||0)+1;unmatched++;if(verbose)console.log('endsFar',id,'faces',occ.map(x=>x.fi).join('/'),'nearest native vertices',a.v&&a.v.id,a.d.toExponential(2),b.v&&b.v.id,b.d.toExponential(2),'segs ends',occ.map(x=>x.ends.length).join('/'));continue;}
    const k=a.v.id<b.v.id?a.v.id+'|'+b.v.id:b.v.id+'|'+a.v.id;cands=byPair.get(k)||[];how='ends';}
  else if(o.ends.length===0){const a=nearV(o.pts[0]);
    // closed edge with one vertex (start=end) or a ring
    if(a.d<=VT){cands=(byPair.get(a.v.id+'|'+a.v.id)||[]);}
    // otherwise any vertex on the loop
    if(!cands.length){for(const p of o.pts){const q=nearV(p);if(q.d<=VT){cands=byPair.get(q.v.id+'|'+q.v.id)||[];if(cands.length)break;}}}
    if(!cands.length)cands=rings;how='ring';}
  else{why['ends'+o.ends.length]=(why['ends'+o.ends.length]||0)+1;unmatched++;continue;}
  // rank by max distance of polyline vertices + segment midpoints (chord sag counted)
  const sc=cands.map(e=>({e,dv:Math.max(...o.pts.concat(o.mids).map(p=>distToEdge(e,p)))})).sort((x,y)=>x.dv-y.dv);
  // a unique native edge between the two end vertices is the match whatever the curve distance;
  // the distance only separates several edges between one vertex pair, or ring candidates
  const uniquePair=how==='ends'&&sc.length===1;
  if(!sc.length||(!uniquePair&&sc[0].dv>5e-5)){why.noCurve=(why.noCurve||0)+1;unmatched++;if(verbose)console.log('nocurve',id,how,sc.slice(0,2).map(s=>s.e.id+':'+s.dv.toExponential(1)));continue;}
  if(sc.length>1&&sc[1].dv<=Math.max(5e-5,sc[0].dv*10)){amb++;}
  const E=sc[0].e;res.push({id,nid:E.id,diff:id-E.id,dv:sc[0].dv,second:sc[1]?sc[1].dv:null,how:uniquePair?'pair':how+(sc.length>1?'+dist':''),type:E.curve.type});
  // literal check: the native edge whose id equals the display id joins the same vertices / lies on the curve
  const lit=M.edges.get(id);if(lit&&lit===E)literalOK++;else literalBad++;
}
const hist={};for(const r of res)hist[r.diff]=(hist[r.diff]||0)+1;
console.log(file.split('/').pop(),'display edge ids',D.size,'matched',res.length,'unmatched',unmatched,JSON.stringify(why),'second candidate within 10x',amb,'diff histogram',JSON.stringify(hist),'literal id = matched edge',literalOK,'not',literalBad);
// collisions
const byN=new Map();for(const r of res){if(!byN.has(r.nid))byN.set(r.nid,[]);byN.get(r.nid).push(r.id);}
console.log('native edges matched by >1 display id',[...byN].filter(([k,v])=>v.length>1).length,'native edges never matched',[...M.edges.keys()].filter(k=>!byN.has(k)).length,'of',M.edges.size);
// runs in native id order
res.sort((a,b)=>a.nid-b.nid);const runs=[];for(const r of res){const l=runs[runs.length-1];if(l&&l.diff===r.diff)l.to=r.nid,l.n++;else runs.push({diff:r.diff,from:r.nid,to:r.nid,n:1});}
console.log('runs (native id order):',runs.length,runs.length<=60?runs.map(r=>r.from+'-'+r.to+':'+(r.diff>0?'+':'')+r.diff+'('+r.n+')').join(' '):'(many) first 40: '+runs.slice(0,40).map(r=>r.from+'-'+r.to+':'+r.diff+'('+r.n+')').join(' '));
const dvs=res.map(r=>r.dv).sort((a,b)=>a-b);const hh={};for(const r of res){const k=r.how+':'+r.diff;hh[k]=(hh[k]||0)+1;}console.log('by how:diff',JSON.stringify(hh));
console.log('curve distance of matched: median',dvs[dvs.length>>1]&&dvs[dvs.length>>1].toExponential(2),'max',dvs[dvs.length-1]&&dvs[dvs.length-1].toExponential(2));
if(verbose)for(const r of res.filter(r=>r.diff!==0).slice(0,400))console.log(JSON.stringify(r));
if(process.env.MAPOUT)fs.writeFileSync(process.env.MAPOUT,JSON.stringify(Object.fromEntries(res.map(r=>[r.id,r.nid]))));
