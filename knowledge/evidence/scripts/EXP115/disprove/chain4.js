const {S,ROOT}=require('./lib');const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');const {fixC0}=require('./fixc0');
const d=S.parse(ROOT+'test files original/chainwheel.sldprt');
let simpleOK=0,simpleNull=0,fanOK=0,agree=0,dis=0,twoSided=0,probs=0;const degs={};
for(const f0 of d.faces){const f=fixC0(f0);const r=fanWalk(f),s=simpleLoops(f);
  if(r.loops.every(l=>l.closed)&&!r.notPerm&&!r.problems.length)fanOK++;else probs++;
  for(const l of r.sides.values())if(l.length===2)twoSided++;
  if(s){simpleOK++;const c=ls=>ls.map(l=>[...new Set(l.segs)].sort().join(';')).sort().join('#');if(c(s)===c(r.loops))agree++;else dis++;}else simpleNull++;}
console.log({faces:d.faces.length,fanOK,probs,simpleOK,simpleNull,agree,dis,twoSided});
