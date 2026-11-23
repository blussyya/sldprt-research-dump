'use strict';
// Corpus scan of cylinder/cone display faces. node scan2.js out.jsonl file1 file2 ... (one process, sequential)
const fs=require('fs');const L=require('./lib');
const THR=+(process.env.THR||1e-9),CH=+(process.env.CH||1e-7);
const bins=[1e-9,1e-8,1e-7,1e-6,1e-5];
const ck=p=>p[0]+','+p[1]+','+p[2];
function analyze(file){
  const {d,M,j}=L.load(file);
  const owner=new Map();
  d.faces.forEach((f,fi)=>{for(let i=0;i<f.vertexCount;i++){const k=ck(L.V(f,i));if(!owner.has(k))owner.set(k,new Set());owner.get(k).add(fi);}});
  const others=M.faces.filter(f=>['plane','cylinder','cone'].includes(f.surface.type));
  const R={file,faces:0,verts:0,hist:[0,0,0,0,0,0],off:0,offB:0,offI:0,offShared:0,offUnshared:0,offChordAdj:0,offChordAnchor:0,offNoChord:0,offNoGraph:0,offOnOther:0,
    ctrlBoundaryOn:0,ctrlBoundaryOnChord:0,shiftedOff:0,shiftedOffChord:0,maxOff:0,interiorOff:0,maxCoord:0,faceRows:[]};
  d.faces.forEach((df,fi)=>{const nf=j[fi].face;if(!nf||!['cylinder','cone'].includes(nf.surface.type))return;
    const s=nf.surface;R.faces++;
    // boundary graph by coordinate
    const adj=new Map(),pos=new Map();
    for(const e of df.edgeAnnotations)if(e.id!==0){const a=ck(L.V(df,e.vertices[0])),b=ck(L.V(df,e.vertices[1]));if(a===b)continue;
      pos.set(a,L.V(df,e.vertices[0]));pos.set(b,L.V(df,e.vertices[1]));
      if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}
    const res=new Map();for(const k of pos.keys())res.set(k,Math.abs(L.dSurf(s,pos.get(k))));
    const chordTests=(k,p)=>{ // returns {adj,anchor} distances; Infinity when graph is not a simple path/cycle at k
      const nb=adj.get(k);if(!nb||nb.size!==2)return {adj:Infinity,anchor:Infinity,graph:false};
      const [n1,n2]=[...nb];const a=L.segDist(p,pos.get(n1),pos.get(n2));
      const walk=(from,k0)=>{let prev=k0,cur=from,g=0;while(res.get(cur)>THR&&g++<1e5){const n=adj.get(cur);if(!n||n.size!==2)return null;const nx=[...n].find(x=>x!==prev);if(nx===undefined)return null;prev=cur;cur=nx;}return cur;};
      const A1=walk(n1,k),A2=walk(n2,k);let b=Infinity;
      if(A1&&A2&&A1!==A2)b=L.segDist(p,pos.get(A1),pos.get(A2));
      return {adj:a,anchor:b,graph:true};};
    const row={fi,type:s.type,rawId:df.metadata.rawId,nv:df.vertexCount,off:0,max:0};
    for(let i=0;i<df.vertexCount;i++){
      const p=L.V(df,i),k=ck(p),r=Math.abs(L.dSurf(s,p));R.verts++;R.maxCoord=Math.max(R.maxCoord,...p.map(Math.abs));
      let b=0;while(b<bins.length&&r>bins[b])b++;R.hist[b]++;
      const isB=adj.has(k),shared=[...owner.get(k)].some(x=>x!==fi);
      if(r>THR){R.off++;row.off++;row.max=Math.max(row.max,r);R.maxOff=Math.max(R.maxOff,r);
        if(isB)R.offB++;else{R.offI++;}
        if(shared)R.offShared++;else R.offUnshared++;
        const c=chordTests(k,p);
        if(!c.graph)R.offNoGraph++;
        else if(c.adj<=CH)R.offChordAdj++;
        else if(c.anchor<=CH)R.offChordAnchor++;
        else R.offNoChord++;
        // shifted control: same vertex moved 5 um radially outward; chord test must now fail
        if(c.graph){const q=L.sub(p,s.p),h=L.dot(q,s.a),rad=[q[0]-h*s.a[0],q[1]-h*s.a[1],q[2]-h*s.a[2]],rl=L.len(rad);
          const ps=[p[0]+5e-6*rad[0]/rl,p[1]+5e-6*rad[1]/rl,p[2]+5e-6*rad[2]/rl];
          const nb=[...adj.get(k)];const dd=L.segDist(ps,pos.get(nb[0]),pos.get(nb[1]));R.shiftedOff++;if(dd<=CH)R.shiftedOffChord++;}
        let on=false;for(const o of others){if(o===nf)continue;if(Math.abs(L.dSurf(o.surface,p))<1e-7){on=true;break;}}if(on)R.offOnOther++;
      }else if(isB){const c=chordTests(k,p);if(c.graph){R.ctrlBoundaryOn++;if(c.adj<=CH)R.ctrlBoundaryOnChord++;}}
    }
    if(row.off)R.faceRows.push(row);
  });
  return R;
}
const out=process.argv[2];
for(const f of process.argv.slice(3)){
  let r;try{r=analyze(f);}catch(e){r={file:f,error:e.message.slice(0,120)};}
  fs.appendFileSync(out,JSON.stringify(r)+'\n');
}
