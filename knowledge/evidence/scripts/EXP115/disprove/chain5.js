const {S,ROOT,files}=require('./lib');const {fanWalk}=require('./fan');
const d=S.parse(ROOT+'test files original/chainwheel.sldprt');const r=S.readBrep(ROOT+'test files original/chainwheel.sldprt');const M=S.brep.model(r.parsed);
function canon(seq){let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();let best=null;for(const q of [s,[...s].reverse()])for(let k=0;k<q.length;k++){const c=q.slice(k).concat(q.slice(0,k)).join(',');if(best===null||c<best)best=c;}return best;}
function applyPerm(f,perm){const ann=f.edgeAnnotations.map(e=>({...e}));const by=new Map();ann.forEach(e=>{if(!by.has(e.strip))by.set(e.strip,[]);by.get(e.strip).push(e);});
  if(perm)for(const [s,l] of by)if(f.stripControls[s]===0&&f.stripLengths[s]===3&&l.length===3){const t=l.map(e=>e.id);l.forEach((e,i)=>e.id=t[perm[i]]);}
  return {...f,edgeAnnotations:ann};}
// join by id set
const nat=M.faces.map(nf=>({nf,ids:[...new Set(nf.loops.flatMap(l=>l.coedges.map(c=>M.edges.get(c.edge).displayId)))].sort((a,b)=>a-b).join(',')}));
let uniq=0,multi=0,none=0;const jn=d.faces.map(f=>{const ids=[...new Set(f.edgeAnnotations.map(e=>e.id).filter(x=>x))].sort((a,b)=>a-b).join(',');const c=nat.filter(n=>n.ids===ids);if(c.length===1)uniq++;else if(c.length>1)multi++;else none++;return c.length===1?c[0].nf:null;});
console.log('join by edge-id set: unique',uniq,'several',multi,'none',none,'of',d.faces.length);
const nloops=nf=>nf.loops.filter(l=>l.coedges.length).map(l=>canon(l.coedges.map(c=>M.edges.get(c.edge).displayId))).sort().join('#');
for(const [name,perm] of [['raw (as converter reads)',null],['swap first two [1,0,2]',[1,0,2]],['[0,2,1]',[0,2,1]],['[1,2,0]',[1,2,0]],['[2,0,1]',[2,0,1]],['[2,1,0]',[2,1,0]]]){
  let match=0,closed=0,tot=0;
  d.faces.forEach((f0,i)=>{if(!jn[i])return;tot++;const f=applyPerm(f0,perm);const fw=fanWalk(f);if(fw.loops.every(l=>l.closed)&&!fw.notPerm&&!fw.problems.length){closed++;
    if(fw.loops.map(l=>canon(l.ids)).sort().join('#')===nloops(jn[i]))match++;}});
  console.log(name.padEnd(28),'faces joined',tot,'fan closed',closed,'loops equal native',match);}
// where control 0 occurs in the corpus
let c0files={};
for(const p of files()){const dd=S.parse(p);let n=0,faces=0;for(const f of dd.faces)if(f.stripControls&&f.stripControls.includes(0)){faces++;n+=f.stripControls.filter(x=>x===0).length;}if(faces)c0files[p.replace(/.*test files /,'')]={faces,strips:n};}
console.log('files with control-0 strips',c0files);
// chainwheel: how many strips are control 0, sizes
let s0=0,s1=0,sizes={};for(const f of d.faces)f.stripControls.forEach((c,k)=>{if(c===0){s0++;sizes[f.stripLengths[k]]=(sizes[f.stripLengths[k]]||0)+1;}else s1++;});
console.log('chainwheel control-0 strips',s0,'sizes',sizes,'control-1 strips',s1);
