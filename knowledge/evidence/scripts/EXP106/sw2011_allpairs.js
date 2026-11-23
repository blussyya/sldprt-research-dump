// For each SW2011 part X: candidates = every SW2011 part's B-rep (readBody). Truth = X's own name.
// Runs HEAD, OLD (517476c) and FULL (all vertices / all surfaces) with 12 candidate orders (fwd, rev, 10 shuffles).
// Also times build vs choose, and checks tied candidates for identical geometry (vertex set + face/edge counts).
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const P=require('/home/user/conv-dev/src/parasolid/partition');
const V={HEAD:require('./variants/select_HEAD.js'),OLD:require('./variants/select_OLD_517476c.js'),FULL:require('./variants/select_FULL.js')};
const MAX=128*1024*1024;
const codec={inflateRaw:b=>zlib.inflateRawSync(b,{maxOutputLength:MAX}),inflate:b=>zlib.inflateSync(b,{maxOutputLength:MAX})};
const base='/home/user/sldprt-research-dump/test files new/SW2011';
const names=fs.readdirSync(base).filter(n=>fs.existsSync(path.join(base,n,'model.SLDPRT'))).sort();
const raws={},bodies={};
for(const n of names){raws[n]=new Uint8Array(fs.readFileSync(path.join(base,n,'model.SLDPRT')));
  try{bodies[n]=P.readBody(raws[n],{},codec).parsed;}catch(e){bodies[n]={error:e.message};}}
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const cands=ord=>ord.map(n=>({name:n,parsed:bodies[n]}));
// identical-geometry signature of a body: rounded sorted vertex coords + face and edge counts
function sig(parsed){const n=require('/home/user/conv-dev/src/brep/native').build(parsed);
  const vs=[...n.vertices.values()].map(v=>v.p.map(c=>c.toFixed(7)).join(',')).sort().join(';');
  return vs+'|F'+n.faces?.length+'|E'+(n.edges?.size??n.edges?.length);}
const res=[];let t={build:0,choose:0};
for(const X of names){
  const row={X,ok:true};
  const fwd=names;const rev=[...names].reverse();const r=rng(names.indexOf(X)+7);
  const orders=[['fwd',fwd],['rev',rev]];for(let i=0;i<10;i++)orders.push(['s'+i,shuffle(names,r)]);
  for(const k of ['HEAD','OLD','FULL']){
    try{const x=V[k].choose(raws[X],cands(fwd),codec.inflateRaw,codec.inflate);row[k]=x.name;row[k+'_fits']=x.matches;row[k+'_disp']=x.displayFaces;
      if(k==='HEAD'){row.rows=x.rows.map(q=>({name:q.name,gap:q.gap,faces:q.faces,res:q.residual?[q.residual.pos,q.residual.ang]:null}));}}
    catch(e){row[k]='ERR '+e.message;}
  }
  const picks={};
  for(const [label,ord] of orders){try{const t0=Date.now();const c=cands(ord);t.build+=Date.now()-t0;const t1=Date.now();
    const x=V.HEAD.choose(raws[X],c,codec.inflateRaw,codec.inflate);t.choose+=Date.now()-t1;picks[label]=x.name;}catch(e){picks[label]='ERR '+e.message.slice(0,40);}}
  row.distinct=[...new Set(Object.values(picks))];row.orders=Object.keys(picks).length;
  res.push(row);
}
// tied pairs: fits>1 and pick must be decided by identical geometry
const tiedRows=res.filter(r=>r.HEAD_fits&&r.HEAD_fits.length>1);
const tieReport=[];
for(const r of tiedRows){const sigs=r.HEAD_fits.map(n=>sig(bodies[n]));
  const same=sigs.every(s=>s===sigs[0]);
  tieReport.push({X:r.X,fits:r.HEAD_fits,residualsEqual:r.rows.filter(q=>r.HEAD_fits.includes(q.name)).every(q=>JSON.stringify(q.res)===JSON.stringify(r.rows.find(z=>z.name===r.HEAD_fits[0]).res)),identicalVertexAndCounts:same,headPick:r.HEAD,distinctAcrossOrders:r.distinct});}
const summary={X_count:names.length,
  headCorrect:res.filter(r=>r.HEAD===r.X).length,
  oldCorrect:res.filter(r=>r.OLD===r.X).length,
  fullCorrect:res.filter(r=>r.FULL===r.X).length,
  headWrong:res.filter(r=>r.HEAD!==r.X).map(r=>({X:r.X,pick:r.HEAD,fits:r.HEAD_fits})),
  headVsOldDiffer:res.filter(r=>r.HEAD!==r.OLD).map(r=>r.X),
  headVsFullDiffer:res.filter(r=>r.HEAD!==r.FULL).map(r=>r.X),
  multiFitCases:tiedRows.length,
  orderUnstable:res.filter(r=>r.distinct.length>1).map(r=>({X:r.X,distinct:r.distinct})),
  tieReport,
  timingMs:t,
  errors:res.filter(r=>String(r.HEAD).startsWith('ERR')||String(r.OLD).startsWith('ERR')||String(r.FULL).startsWith('ERR')).map(r=>r.X)};
fs.writeFileSync(__dirname+'/sw2011_allpairs.json',JSON.stringify({summary,rows:res},null,1));
console.log(JSON.stringify(summary,null,1));
