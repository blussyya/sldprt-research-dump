const {S,files,ROOT}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
function canon(seq){let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();let best=null;for(const q of [s,[...s].reverse()])for(let k=0;k<q.length;k++){const c=q.slice(k).concat(q.slice(0,k)).join(',');if(best===null||c<best)best=c;}return best;}
const nloops=(M,nf)=>nf.loops.filter(l=>l.coedges.length).map(l=>canon(l.coedges.map(c=>M.edges.get(c.edge).displayId))).sort().join('#');
const rows=require('fs').readFileSync('cause159_rows.tsv','utf8').trim().split('\n').map(l=>l.split('\t')).filter(r=>!/chainwheel|f666/.test(r[0]));
const byFile=new Map();for(const r of rows){if(!byFile.has(r[0]))byFile.set(r[0],[]);byFile.get(r[0]).push(+r[1]);}
const R={facesChecked:0,loopsEqualNative:0,continuityBad:0,
  c1_wrongNativeFace_equal:0,c1_total:0,
  c2_seamOnce_sidesEqualNative:0,c2_total:0,
  vertexOnlyLoops:0,vertexOnlyFaces:{},
  idRelabelFaces:0,structEqualAfterRelabel:0,
  perturbDetected:0,perturbTotal:0};
const seamFaces=[];
for(const p of files()){const short=p.replace(/.*test files /,'');if(!byFile.has(short))continue;
  const d=S.parse(p);const r=S.readBrep(p);const M=S.brep.model(r.parsed);const j=J.join(d.faces,M);
  const cand=byFile.get(short).filter(i=>j[i].face);
  cand.forEach((i,ci)=>{const f=d.faces[i],nf=j[i].face;R.facesChecked++;
    const fw=fanWalk(f);
    // continuity
    let cont=true;fw.loops.forEach(l=>{for(let k=0;k<l.half.length;k++){const h=fw.half[l.half[k]],n=fw.half[l.half[(k+1)%l.half.length]];if(n.a!==h.b)cont=false;}});if(!cont)R.continuityBad++;
    const dl=fw.loops.map(l=>canon(l.ids)).sort().join('#'),nl=nloops(M,nf);
    if(dl===nl)R.loopsEqualNative++;else{
      // relabel by first occurrence, compare structure
      const relabel=s=>{const m=new Map();return s.split('#').map(l=>l.split(',').map(x=>{if(!m.has(x))m.set(x,m.size);return m.get(x);}).join(',')).sort().join('#');};
      R.idRelabelFaces++;
      // compare loop-length multiset only
      const len=s=>s.split('#').map(l=>l.split(',').length).sort().join(',');
      if(len(dl)===len(nl))R.structEqualAfterRelabel++;}
    // vertex only loops
    const vl=nf.loops.filter(l=>!l.coedges.length).length;if(vl){R.vertexOnlyLoops+=vl;R.vertexOnlyFaces[nf.surface.type]=(R.vertexOnlyFaces[nf.surface.type]||0)+1;}
    // control 1: compare with the next candidate's native face (wrong face)
    const other=j[cand[(ci+1)%cand.length]].face;if(other&&other!==nf&&cand.length>1){R.c1_total++;if(dl===nloops(M,other))R.c1_wrongNativeFace_equal++;}
    // control 2: walk each seam side once (dedupe segments): sides per id vs native coedge count
    const seg=new Map();fw.half.forEach(h=>{const k=h.a<h.b?h.a+'|'+h.b:h.b+'|'+h.a;seg.set(k,h.id);});
    const dedupe=new Map();for(const id of seg.values())dedupe.set(id,1);
    const ns=new Map();for(const l of nf.loops)for(const c of l.coedges){const id=M.edges.get(c.edge).displayId;ns.set(id,(ns.get(id)||0)+1);}
    const hasTwo=[...fw.sides.values()].some(l=>l.length===2);
    if(hasTwo){R.c2_total++;let eq=true;for(const [id,s] of dedupe)if(ns.get(id)!==s)eq=false;if(eq)R.c2_seamOnce_sidesEqualNative++;}
  });
}
// perturbation control for fan-vs-simple: zero one id in each of 600 random simple faces of one file; count faces where simple or fan notices (null / not closed / loops differ)
{let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
 const p=files().find(x=>/4803f393_box/.test(x));const d=S.parse(p);
 const idx=d.faces.map((f,i)=>i).filter(i=>!d.faces[i].noEdgeTable&&simpleLoops(d.faces[i]));
 for(let n=0;n<600;n++){const f0=d.faces[idx[Math.floor(rnd()*idx.length)]];const ann=f0.edgeAnnotations.map(e=>({...e}));
   const nz=ann.filter(e=>e.id);const e=nz[Math.floor(rnd()*nz.length)];const bad=e.id;ann.forEach(x=>{if(x.vertices.join()===e.vertices.join()&&x.id===bad)x.id=0;}); // drop one triangle edge's id
   const f={...f0,edgeAnnotations:ann};R.perturbTotal++;
   const fw=fanWalk(f),sl=simpleLoops(f),base=simpleLoops(f0);
   const c=ls=>ls.map(l=>[...new Set(l.segs)].sort().join(';')).sort().join('#');
   const noticed=!sl||fw.problems.length||fw.notPerm||fw.loops.some(l=>!l.closed)||c(sl)!==c(base);if(noticed)R.perturbDetected++;}}
console.log(JSON.stringify(R,null,1));
