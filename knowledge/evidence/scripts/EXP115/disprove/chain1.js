const {S,ROOT}=require('./lib');const {fanWalk}=require('./fan');
const p=ROOT+'test files original/chainwheel.sldprt';const d=S.parse(p);
console.log(d.format,d.faces.length,'rejected',d.rejected.length,'warnings',d.warnings.length,d.warnings.slice(0,3));
const cnt={};let i=0;const pr={};
for(const f of d.faces){i++;const r=fanWalk(f);
  const bad=r.loops.some(l=>!l.closed)||r.notPerm||r.problems.length;
  const k=bad?'bad':'ok';cnt[k]=(cnt[k]||0)+1;
  if(bad){for(const x of r.problems)pr[x.replace(/[\d|>]+/g,'#')]=(pr[x.replace(/[\d|>]+/g,'#')]||0)+1;
    if(cnt.bad<=3)console.log(i,'tris',r.n,'loops',r.loops.length,'notPerm',r.notPerm,r.problems.slice(0,3));}
}
console.log(cnt,pr);
