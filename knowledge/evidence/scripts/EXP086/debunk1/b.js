const {stats,out}=JSON.parse(require('fs').readFileSync('out.json'));
console.log(stats);
const rows=out.filter(r=>!r.err);
console.log('errs',out.filter(r=>r.err).length,'rows',rows.length,'skip',rows.filter(r=>r.skip).length);
const uniq=new Map();for(const r of rows){const k=r.f+'|'+r.off;if(!uniq.has(k))uniq.set(k,[]);uniq.get(k).push(r);}
console.log('unique offsets',uniq.size);
const cls={};const bad=[];
for(const [k,rs] of uniq){
  // per-offset: use all curves
  const r=rs.filter(x=>x.mean!==undefined);if(!r.length){cls['nodata']=(cls['nodata']||0)+1;continue;}
  const x=r[0];
  const key=[x.basisType,'d'+(x.d<0?'-':'+'),'bs'+x.basisSense,'os'+x.offSense].join(' ');
  const obs=Math.abs(x.mean-x.d)<1e-4*Math.max(1,Math.abs(x.d))+1e-6?'+d':Math.abs(x.mean+x.d)<1e-4*Math.max(1,Math.abs(x.d))+1e-6?'-d':'other';
  const kk=key+' -> '+obs;cls[kk]=(cls[kk]||0)+1;
  if(obs!=='other'&&((x.basisSense===-1)!==(obs==='-d'))||obs==='other')bad.push({k,x,obs,all:r.map(y=>[y.mean,y.oor])});
}
console.log(cls);
console.log(JSON.stringify(bad.slice(0,30),null,0));console.log(bad.length);
