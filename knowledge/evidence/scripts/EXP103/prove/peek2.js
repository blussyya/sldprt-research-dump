const {M}=require('./load')('/home/user/conv-dev');
const e=M.edges.get(844);console.log(e.v,e.curve&&e.curve.type);
for(const id of e.v){const v=M.vertices.get(id);console.log(id,v&&v.p,v&&v.tolerance)}
const c=require('/home/user/sldprt-research-dump/knowledge/evidence/scripts/EXP103/e844-capture.json');console.log(c.p0,c.p1,c.sameSense,c.id,c.c.tolerance);
const s=c.c.surface;console.log(s.weights&&JSON.stringify(s.weights).slice(0,100),s.uRange,s.ku.slice(0,6),s.ku.slice(-6),s.kv,s.fitted,s.radius);
