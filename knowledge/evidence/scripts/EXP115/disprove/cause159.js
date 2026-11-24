const {S,files,key}=require('./lib');const J=require('/home/user/solidworks-converters/src/brep/display-join');
const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
const out={faces:0,joined:0,cause:{},surf:{},vertexHist:{},sidesMatch:0,sidesDiff:0,loopsEqualNative:0,loopsDiffNative:0,idMismatchFaces:0,otherCause:[],vloops:0,perFile:{}};
const rows=[];
for(const p of files()){
  const d=S.parse(p);
  // quick prefilter: any vertex degree != 2
  const cand=[];d.faces.forEach((f,i)=>{if(f.noEdgeTable)return;if(!simpleLoops(f))cand.push(i);});
  if(!cand.length)continue;
  const short=p.replace(/.*test files /,'');
  let M=null,j=null;try{const r=S.readBrep(p);M=S.brep.model(r.parsed);j=J.join(d.faces,M);}catch(e){}
  for(const i of cand){
    const f=d.faces[i];out.faces++;out.perFile[short]=(out.perFile[short]||0)+1;
    const fw=fanWalk(f);
    // segment sides
    const two=[...fw.sides].filter(([k,l])=>l.length===2).map(([k])=>k);
    // degree per welded vertex, incident two-sided count
    const {weld}=require('./fan');const {w}=weld(f);
    const adj=new Map();const seg=new Set();
    for(const e of f.edgeAnnotations)if(e.id){const a=w(e.vertices[0]),b=w(e.vertices[1]);if(a===b)continue;const k=a<b?a+'|'+b:b+'|'+a;if(seg.has(k))continue;seg.add(k);
      for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(k);}}
    const twoSet=new Set(two);let cause=null;const vt=[];
    for(const [v,l] of adj){if(l.length===2)continue;const k=l.filter(s=>twoSet.has(s)).length;const h=l.length+'/'+k;out.vertexHist[h]=(out.vertexHist[h]||0)+1;vt.push(h);}
    // do the loops visit a deg-4 vertex twice (touching)?
    const touch=vt.some(h=>h==='4/0');
    cause=two.length&&touch?'seamAndTouch':two.length?'twiceUsedEdge':touch?'touch':'other';
    out.cause[cause]=(out.cause[cause]||0)+1;
    const nonexp=vt.filter(h=>!['1/1','3/1','4/0','4/2','3/0x'].includes(h));
    if(cause==='other'||nonexp.length)out.otherCause.push([short,i,cause,vt.join(',')]);
    let st='?';
    if(j&&j[i].face){out.joined++;const nf=j[i].face;st=nf.surface.type;
      // native sides per displayId
      const ns=new Map();let vl=0;for(const l of nf.loops){if(!l.coedges.length)vl++;for(const c of l.coedges){const id=M.edges.get(c.edge).displayId;ns.set(id,(ns.get(id)||0)+1);}}
      out.vloops+=vl;
      const ds=new Map();// id -> halfedge count / segments
      const segCount=new Map(),halfCount=new Map();
      fw.half.forEach(h=>{halfCount.set(h.id,(halfCount.get(h.id)||0)+1);});
      const segsById=new Map();for(const [k,l] of fw.sides){}
      // distinct segments by id
      const idOfSeg=new Map();fw.half.forEach(h=>idOfSeg.set(h.a<h.b?h.a+'|'+h.b:h.b+'|'+h.a,h.id));
      for(const [k,id] of idOfSeg)segCount.set(id,(segCount.get(id)||0)+1);
      let ok=true;const dIds=new Set(halfCount.keys());
      for(const id of dIds){const sides=halfCount.get(id)/segCount.get(id);if(!ns.has(id)){ok=false;continue;}if(sides!==ns.get(id)&&!(sides>=1&&ns.get(id)>=1&&Math.round(sides)===ns.get(id)))ok=false;}
      if(!ok){out.sidesDiff++;if([...dIds].every(id=>!ns.has(id)))out.idMismatchFaces++;}else out.sidesMatch++;
    }
    out.surf[st+(two.length?' (twice)':'')]=(out.surf[st+(two.length?' (twice)':'')]||0)+1;
    rows.push([short,i,cause,st,two.length,vt.join(',')].join('\t'));
  }
}
console.log(JSON.stringify(out,null,1));require('fs').writeFileSync('cause159_rows.tsv',rows.join('\n')+'\n');
