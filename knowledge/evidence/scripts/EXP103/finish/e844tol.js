// EXP-103 (finish): edge 844 on head_back in the native model (no resolve): its curve type, its
// own tolerance, its vertices' tolerances, and the faces on either side.
const R=process.env.CONV||'/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native');
const M=N.build(S.readBrep(process.argv[2]).parsed),e=M.edges.get(+process.argv[3]);
console.log('edge',e.id,'curve',e.curve.type,'curve tolerance_to_original',e.curve.tolerance,'| edge tolerance',e.tolerance,'tolerant',e.tolerant,'sameSense',e.sameSense);
for(const id of e.v||[]){const v=M.vertices.get(id);console.log(' vertex',id,'p',v.p.map(x=>x.toFixed(9)).join(','),'tolerance',v.tolerance);}
console.log(' pcurves',(e.pcurves||[]).map(p=>'face '+p.face+' '+(p.curve&&p.curve.type)).join(' | ')||'none');
const faces=[...M.faces.values()].filter(f=>JSON.stringify(f.loops||f.edges||[]).includes('"'+e.id+'"')||(f.loops||[]).some(l=>(l.edges||l).some&&(l.edges||l).some(x=>(x.edge||x)===e.id)));
console.log(' faces using it',faces.map(f=>f.id+' '+(f.surface&&f.surface.type)).join(', ')||'(not found by this search)');
