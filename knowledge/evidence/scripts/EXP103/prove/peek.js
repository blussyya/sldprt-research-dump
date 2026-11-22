const {M}=require('./load')('/home/user/conv-dev');
const e=M.edges.get(844)||[...M.edges.values()].find(x=>x.id===844);
console.log(Object.keys(e),e.tolerance,e.sameSense);
for(const k of ['v0','v1','start','end','vertices','p0','p1']) if(e[k]!==undefined)console.log(k,JSON.stringify(e[k]).slice(0,200));
console.log(M.vertices.size, [...M.vertices.values()][0]);
