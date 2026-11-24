const rows=JSON.parse(require('fs').readFileSync('/tmp/claude-0/-home-user/07cc0b43-8431-53bf-9c6e-c1eac6d58a3f/scratchpad/join.json'));
for(const g of ['C','A']){
  const u=rows.filter(r=>r.lay===g&&r.ncand===1&&r.res!=null);
  const bins=[1e-7,1e-6,1e-5,1e-4,1e-3,1e-2,Infinity];const h=bins.map(()=>0);
  for(const r of u){h[bins.findIndex(b=>r.res<b)]++;}
  console.log(g,'residual histogram (<1e-7,<1e-6,<1e-5,<1e-4,<1e-3,<1e-2,more)',h.join(' '));
  const big=u.filter(r=>r.res>=1e-5);const byF={};
  for(const r of big){const k=r.file.split('/').pop()+' '+r.ntype;byF[k]=byF[k]||{n:0,max:0};byF[k].n++;byF[k].max=Math.max(byF[k].max,r.res);}
  console.log(Object.entries(byF).sort((a,b)=>b[1].n-a[1].n).slice(0,12).map(([k,v])=>k+' n='+v.n+' max='+v.max.toExponential(2)).join('\n'));
}
