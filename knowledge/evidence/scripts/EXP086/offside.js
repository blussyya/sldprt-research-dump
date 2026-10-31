// Which side of its basis does an offset surface lie on? For every offset that bounds an
// intersection curve, measure the curve's chart points against basis + d·n and basis − d·n
// (n = the basis's own du × dv normal), and tally by the offset's and the basis's sense.
const R=process.env.CONV||require('path').join(__dirname,'../../../../../solidworks-converters'),S=require(R+'/src'),N=require(R+'/src/brep/native'),G=require(R+'/src/geom/eval');
const tally={};
for(const f of process.argv.slice(2)){let M;try{M=N.build(S.readBrep(f).parsed);}catch(e){continue;}
  const seen=new Set(),curves=[];
  const walk=c=>{if(!c||seen.has(c))return;seen.add(c);if(c.type==='trimmed')return walk(c.basis);if(c.type==='intersection')curves.push(c);};
  for(const e of M.edges.values())walk(e.curve);
  for(const s of [...M.faces.values()].map(x=>x.surface))if(s&&s.type==='blend'&&s.spine)walk(s.spine);
  for(const c of curves)for(const s of c.surfaces){if(s.type!=='offset'||!c.chart)continue;
    let plus=0,minus=0,n=0;
    for(const p of c.chart){try{const r=G.surfaceInverse(s.basis,p),e=G.surfaceEval(s.basis,r.u,r.v),nn=G.unit(G.cross(e.du,e.dv));
      plus=Math.max(plus,G.dist(p,G.add(e.p,G.mul(nn,s.d))));minus=Math.max(minus,G.dist(p,G.add(e.p,G.mul(nn,-s.d))));n++;}catch(x){}}
    if(!n)continue;const side=plus<1e-6&&minus>1e-6?'+':minus<1e-6&&plus>1e-6?'-':'?';
    const k='offset '+s.sense+' basis '+s.basis.type+' '+s.basis.sense+' side '+side;(tally[k]=tally[k]||[]).push(require('path').basename(f).slice(0,8)+':'+s.node);}}
for(const k of Object.keys(tally).sort())console.log(k.padEnd(40),tally[k].length,tally[k].slice(0,4).join(' '));
