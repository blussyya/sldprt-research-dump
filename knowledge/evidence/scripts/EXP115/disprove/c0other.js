const {S,files,key}=require('./lib');const {fanWalk}=require('./fan');const {fixC0}=require('./fixc0');const J=require('/home/user/solidworks-converters/src/brep/display-join');
function canon(seq){let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();let best=null;for(const q of [s,[...s].reverse()])for(let k=0;k<q.length;k++){const c=q.slice(k).concat(q.slice(0,k)).join(',');if(best===null||c<best)best=c;}return best;}
for(const p of files().filter(p=>/6ff6c243|4febfc67/.test(p))){
  const d=S.parse(p);const r=S.readBrep(p);const M=S.brep.model(r.parsed);const j=J.join(d.faces,M);
  d.faces.forEach((f,i)=>{if(!f.stripControls.includes(0))return;
    const nf=j[i].face;const nl=nf?nf.loops.filter(l=>l.coedges.length).map(l=>canon(l.coedges.map(c=>M.edges.get(c.edge).displayId))).sort().join('#'):null;
    for(const [n,ff] of [['raw',f],['swapped',fixC0(f)]]){const fw=fanWalk(ff);
      console.log(p.replace(/.*test files /,''),'face',i,n,'closed',fw.loops.every(l=>l.closed)&&!fw.problems.length,'loops',fw.loops.length,'native loops',nf&&nf.loops.length,'equal native',fw.loops.map(l=>canon(l.ids)).sort().join('#')===nl,'ctrl0 strips',f.stripControls.filter(x=>x===0).length,'sizes',[...new Set(f.stripLengths.filter((_,k)=>f.stripControls[k]===0))]);}
    // are the control-0 triangles on edges with all-zero ids?
    const by=new Map();f.edgeAnnotations.forEach(e=>{if(!by.has(e.strip))by.set(e.strip,[]);by.get(e.strip).push(e.id);});
    console.log('  ctrl0 strip ids',f.stripControls.map((c,k)=>c===0?by.get(k).join('/'):null).filter(x=>x!==null).join(' ; '));});
}
