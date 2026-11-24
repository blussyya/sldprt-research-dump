// For every cylinder/cone display vertex >1e-7 m off the exact surface: distance to chord of its boundary
// neighbours, to the annotated edge curve(s), to every edge curve of the face loops, to every other face's surface
// sharing a loop edge. Output: summary + jsonl of every off vertex.
const L=require('./lib.js');
const name=process.argv[2],outp=process.argv[3]||('/tmp/claude-0/'+name+'_off.jsonl');
const {d,N,j,edgeByDisp}=L.load(L.PARTS[name]||name);
if(process.env.RESOLVE){const t=Date.now();L.setResolved(require('/home/user/solidworks-converters/src/brep/procedural.js').resolve(N));console.error('resolve s',(Date.now()-t)/1e3);}
const faceOfId=new Map(N.faces.map(f=>[f.id,f]));
const edgeFaces=new Map();for(const f of N.faces)for(const l of f.loops)for(const c of l.coedges){if(!edgeFaces.has(c.edge))edgeFaces.set(c.edge,new Set());edgeFaces.get(c.edge).add(f.id);}
const out=[];const lines=[];
const stat={};const bump=(k)=>stat[k]=(stat[k]||0)+1;
d.faces.forEach((f,fi)=>{const m=j[fi];if(!m.face)return;const nf=m.face,s=nf.surface;if(s.type!=='cylinder'&&s.type!=='cone')return;
  const adj=new Map();for(const cy of f.boundaryCycles||[]){const n=cy.vertices.length;for(let i=0;i<n;i++){const v=cy.vertices[i],pv=cy.vertices[(i+n-1)%n],nx=cy.vertices[(i+1)%n];if(!adj.has(v))adj.set(v,[]);adj.get(v).push({o:pv,id:cy.edgeIds[(i+n-1)%n]},{o:nx,id:cy.edgeIds[i]});}}
  const posAdj=new Map();for(const [v,a] of adj)posAdj.set(L.vtx(f,v).join(','),a);
  const loopEdges=[...new Set(nf.loops.flatMap(l=>l.coedges.map(c=>c.edge)))].map(id=>N.edges.get(id)).filter(Boolean);
  const otherSurf=[];for(const e of loopEdges)for(const fid of edgeFaces.get(e.id)||[])if(fid!==nf.id)otherSurf.push({fid,s:faceOfId.get(fid).surface});
  for(let k=0;k<f.vertexCount;k++){const p=L.vtx(f,k),r=L.DJ.residual(s,p);const ar=Math.abs(r);
    let nb=adj.get(k)||[];let viaDup=false;
    if(!nb.length){const key=p.join(',');const alt=posAdj.get(key);if(alt){nb=alt;viaDup=true;}}
    const rec={part:name,fi,face:nf.displayId,how:m.how,stype:s.type,k,res:r,boundary:nb.length>0,nb:nb.length,viaDup};
    if(nb.length){// chord: min over neighbour pairs (distinct vertices)
      let best=Infinity,bt=null;const os=[...new Set(nb.map(x=>x.o))];
      for(let a=0;a<os.length;a++)for(let b=a+1;b<os.length;b++){const sd=L.segDist(p,L.vtx(f,os[a]),L.vtx(f,os[b]));if(sd.d<best){best=sd.d;bt=sd.t;}}
      rec.chord=os.length>=2?best:null;rec.chordT=bt;rec.nbOnSurf=os.map(o=>Math.abs(L.DJ.residual(s,L.vtx(f,o))));
      const ids=[...new Set(nb.map(x=>x.id))];rec.ids=ids;
      const cands=ids.flatMap(id=>edgeByDisp.get(id)||[]);rec.nCand=cands.length;rec.ctypes=cands.map(e=>(e.curve.type==='trimmed'?'trimmed:'+e.curve.basis.type:e.curve.type)+(e.tolerant?'(tol)':''));
      // restrict to candidates that bound this face
      const mine=cands.filter(e=>loopEdges.includes(e));rec.nMine=mine.length;
      const dc=mine.map(e=>L.curveDist(e,p)).filter(x=>x!==null);rec.dCurve=dc.length?Math.min(...dc):null;
      rec.dFin=(()=>{const x=mine.flatMap(e=>L.finDists(e,p));return x.length?Math.min(...x):null})();rec.dCurveAnyCand=(()=>{const x=cands.map(e=>L.curveDist(e,p)).filter(x=>x!==null);return x.length?Math.min(...x):null;})();
    }
    if(ar>1e-7){const all=loopEdges.map(e=>L.curveDist(e,p)).filter(x=>x!==null);rec.dAnyLoopCurve=all.length?Math.min(...all):null;
      const resOf=o=>{try{const r=L.DJ.residual(o.s,p);return r===null||isNaN(r)?null:Math.abs(r)}catch(e){return null}};
      const os=otherSurf.map(resOf).filter(x=>x!==null);rec.dOtherSurf=os.length?Math.min(...os):null;rec.nOtherSurfAnalytic=os.length;
      // surfaces across the annotated edges only
      const mine2=(rec.ids||[]).flatMap(id=>(edgeByDisp.get(id)||[]).filter(e=>loopEdges.includes(e)));
      const nbS=mine2.flatMap(e=>[...(edgeFaces.get(e.id)||[])].filter(fid=>fid!==nf.id).map(fid=>({s:faceOfId.get(fid).surface})));
      const ns=nbS.map(resOf).filter(x=>x!==null);rec.dNbSurf=ns.length?Math.min(...ns):null;rec.nbTypes=nbS.map(o=>o.s.type);
      out.push(rec);}
    else if(nb.length&&ar<1e-9){rec.control=true;lines.push(rec);} // on-surface boundary controls
  }});
require('fs').writeFileSync(outp,out.map(x=>JSON.stringify(x)).join('\n'));
require('fs').writeFileSync(outp.replace('.jsonl','_ctl.jsonl'),lines.map(x=>JSON.stringify(x)).join('\n'));
const q=a=>{a=a.filter(x=>x!==null&&x!==undefined).sort((x,y)=>x-y);return a.length?[a[0],a[a.length>>1],a[a.length-1]].map(x=>x.toExponential(1)).join(' / '):'-';};
console.log(name,'off>1e-7:',out.length,'boundary',out.filter(r=>r.boundary).length,'interior',out.filter(r=>!r.boundary).length);
const B=out.filter(r=>r.boundary);
console.log(' chord dist min/med/max',q(B.map(r=>r.chord)));
for(const th of [1e-9,1e-8,3e-8,1e-7,1e-6])console.log('  chord<=',th,B.filter(r=>r.chord!==null&&r.chord<=th).length);
console.log(' off-chord (chord>3e-8):',B.filter(r=>r.chord!==null&&r.chord>3e-8).length,' no chord(1 nb):',B.filter(r=>r.chord===null).length);
const ctl=lines;console.log(' control on-surface boundary verts',ctl.length,'dCurve min/med/max',q(ctl.map(r=>r.dCurve)),'nullCurve',ctl.filter(r=>r.dCurve===null).length);
