const {S,files}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');const {fixC0}=require('./fixc0');
const only=process.argv[2]||'';
function canon(seq){ // cyclic sequence of ids, collapse consecutive dups (cyclic), min over rotations and reversal
  let s=seq.filter((x,i)=>i===0||x!==seq[i-1]);while(s.length>1&&s[0]===s[s.length-1])s.pop();
  let best=null;for(const q of [s,[...s].reverse()])for(let r=0;r<q.length;r++){const c=q.slice(r).concat(q.slice(0,r)).join(',');if(best===null||c<best)best=c;}
  return best;
}
const T={files:0,facesTable:0,joined:0,notJoined:0,match:0,mismatch:0,loopCountDiff:0,contentDiff:0,vertexLoops:0,seamFaces:0,seamMatch:0,seamMismatch:0,nonSimple:0,nonSimpleMatch:0,nonSimpleJoined:0};
const mism=[],nj={};
for(const p of files()){
  if(only&&!p.includes(only))continue;
  const d=S.parse(p);let M,j;
  try{const r=S.readBrep(p);M=S.brep.model(r.parsed);j=J.join(d.faces,M);}catch(e){nj[p.replace(/.*test files /,'')]='native '+e.message.slice(0,60);continue;}
  T.files++;
  d.faces.forEach((f0,i)=>{
    if(f0.noEdgeTable)return;T.facesTable++;
    const isChain=/chainwheel/.test(p);const f=isChain?fixC0(f0):f0;
    const simple=simpleLoops(f);if(!simple)T.nonSimple++;
    const jf=j[i];if(!jf.face){T.notJoined++;const k=p.replace(/.*test files /,'');nj[k]=(nj[k]||0)+1;return;}
    T.joined++;if(!simple)T.nonSimpleJoined++;
    const r=fanWalk(f);if(r.loops.some(l=>!l.closed)||r.notPerm){mism.push([p,i,'fan open']);T.mismatch++;return;}
    const dl=r.loops.map(l=>canon(l.ids)).sort();
    const nl=[];let vl=0;for(const l of jf.face.loops){if(!l.coedges.length){vl++;continue;}nl.push(canon(l.coedges.map(c=>M.edges.get(c.edge).displayId)));}
    T.vertexLoops+=vl;nl.sort();
    const seam=!simple;if(seam)T.seamFaces++;
    if(dl.join('#')===nl.join('#')){T.match++;if(!simple)T.nonSimpleMatch++;}
    else{T.mismatch++;if(dl.length!==nl.length)T.loopCountDiff++;else T.contentDiff++;mism.push([p.replace(/.*test files /,''),i,'native '+jf.face.id,'disp loops '+dl.length+' native '+nl.length,!simple?'NONSIMPLE':'simple',dl.join(' # ').slice(0,200),'||',nl.join(' # ').slice(0,200)]);}
  });
}
console.log(T);console.log('not joined / errors',nj);console.log('mismatches',mism.length);for(const m of mism.slice(0,40))console.log(m.join(' '));
