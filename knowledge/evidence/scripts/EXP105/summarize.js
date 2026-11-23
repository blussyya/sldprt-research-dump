for(const id of ['8cd79ff5','a4ecc6f5','2f121983']){const j=JSON.parse(require('fs').readFileSync('out_'+id+'.json'));
 const F=j.faces;console.log(id,'faces',F.length,'missing/mismatch',F.filter(f=>f.missing||f.mismatch).length);
 for(const t of ['cylinder','cone']){const g=F.filter(f=>f.type===t);const bad=g.filter(f=>f.max>1e-8);
  console.log(' ',t,g.length,'over 1e-8 m:',bad.length,'worst max',Math.max(0,...g.map(f=>f.max)).toExponential(2));}
 for(const f of F.filter(f=>f.max>1e-8).sort((a,b)=>b.max-a.max).slice(0,12))console.log('   ',f.id,f.type,'r',f.r.toPrecision(4),'ang',f.angle&&f.angle.toFixed(4),'n',f.n,'mean',f.mean.toExponential(2),'max',f.max.toExponential(2),'mean/r',f.rel.toExponential(2),'cenMax',f.cenMax.toExponential(2));}
