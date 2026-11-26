// EXP-119: what face 13077's blend fit does while it runs for minutes. Counts the evaluator calls
// by name and prints the calling fit functions every 300,000 calls, so a loop shows its place.
// usage: node stuck.js <part> <face id>
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),F=require(R+'/src/brep/fit'),G=require(R+'/src/geom/eval'),fs=require('fs');
const [file,fid]=process.argv.slice(2),M=N.build(S.readBrep(fs.readFileSync(file)).parsed),f=M.faces.find(x=>x.id===+fid),t0=Date.now();
const out=m=>fs.writeSync(1,m+'\n'),cnt={},ms={};let all=0,depth=0,lastPrint=Date.now();
const totals=()=>Object.entries(ms).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k} ${(v/1000).toFixed(1)} s / ${cnt[k]} calls`).join(', ');
for(const k of Object.keys(G))if(typeof G[k]==='function'){const g=G[k];G[k]=function(...a){cnt[k]=(cnt[k]||0)+1;
  if(depth===0){depth++;const t=Date.now();try{return g.apply(this,a);}finally{depth--;ms[k]=(ms[k]||0)+Date.now()-t;if(Date.now()-lastPrint>60000){lastPrint=Date.now();out(`${((Date.now()-t0)/1000).toFixed(0)} s: ${totals()}`);}}}
  if(++all%300000===0){const st=(new Error().stack.split('\n').slice(2).map(l=>(l.match(/at (\S+)/)||[])[1]).filter(Boolean).filter(x=>!/^(Object|Array|Module|Function|node:)/.test(x)).slice(0,10)).join(' < ');
    out(`${((Date.now()-t0)/1000).toFixed(0)} s, ${all} calls; ${k} from ${st}`);}
  return g.apply(this,a);};}
const b=f.surface,sp=b.spine.type==='trimmed'?b.spine.basis:b.spine;
out(`spine ${sp.type}${sp.node||''}: surfaces ${(sp.surfaces||[]).map(s=>s.type+(s.node||'')+(s.type==='offset'?' d '+s.d+' of '+s.basis.type+(s.basis.node||'')+(s.basis.type==='blend'?' r '+JSON.stringify(s.basis.range):''):'')).join(' x ')}; chart ${sp.chart?sp.chart.length:0} points; start ${sp.start&&sp.start.type} end ${sp.end&&sp.end.type}`);
let r;try{r=F.spineOf(b,1e-8);out(`spine done ${((Date.now()-t0)/1000).toFixed(1)} s, error ${r.error.toExponential(2)}; ${totals()}`);}catch(e){out('spine threw: '+e.message);}
try{r=F.blendSurface(b,f,M,{tolerance:1e-8});out(`surface done ${((Date.now()-t0)/1000).toFixed(1)} s, error ${r.error.toExponential(2)}; ${totals()}`);}catch(e){out('surface threw: '+e.message);}
out('calls '+JSON.stringify(cnt));
