const {S,ROOT}=require('./lib');const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
function canon(seq){let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();let best=null;for(const q of [s,[...s].reverse()])for(let k=0;k<q.length;k++){const c=q.slice(k).concat(q.slice(0,k)).join(',');if(best===null||c<best)best=c;}return best;}
const p=ROOT+'test files online/2013/f666f342_head_face.sldprt';
const d=S.parse(p);const r=S.readBrep(p);const M=S.brep.model(r.parsed);
const nat=M.faces.map(nf=>({nf,ids:[...new Set(nf.loops.flatMap(l=>l.coedges.map(c=>M.edges.get(c.edge).displayId)))].sort((a,b)=>a-b).join(',')}));
let uniq=0,none=0,multi=0,match=0,mism=[];let nonsimple=[];
d.faces.forEach((f,i)=>{const ids=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].sort((a,b)=>a-b).join(',');
  const c=nat.filter(n=>n.ids===ids);if(c.length!==1){c.length?multi++:none++;if(!simpleLoops(f))nonsimple.push([i,'join '+c.length]);return;}uniq++;
  const fw=fanWalk(f);const dl=fw.loops.map(l=>canon(l.ids)).sort().join('#');
  const nl=c[0].nf.loops.filter(l=>l.coedges.length).map(l=>canon(l.coedges.map(x=>M.edges.get(x.edge).displayId))).sort().join('#');
  if(dl===nl)match++;else mism.push(i);
  if(!simpleLoops(f))nonsimple.push([i,'native loops '+c[0].nf.loops.length+' fan loops '+fw.loops.length+' equal '+(dl===nl)+' surf '+c[0].nf.surface.type]);});
console.log({faces:d.faces.length,joinedUnique:uniq,none,multi,loopsEqual:match,mismatchFaces:mism.length,mism:mism.slice(0,10)});console.log('non-simple faces',nonsimple);
// the 2 faces with unannotated mesh boundary
for(const i of [75,448]){const f=d.faces[i];const ids=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].sort((a,b)=>a-b).join(',');const c=nat.filter(n=>n.ids===ids);console.log('face',i,'native candidates',c.length,c[0]&&c[0].nf.surface.type,'native loops',c[0]&&c[0].nf.loops.length,'fan loops',fanWalk(f).loops.length);}
