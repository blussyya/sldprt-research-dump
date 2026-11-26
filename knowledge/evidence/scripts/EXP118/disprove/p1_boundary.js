// Claim 1, part 1: for faces 75 and 448 of f666f342, list mesh-boundary edges (used by one
// triangle after exact welding), split by whether they carry a Block1 id, and chain them.
// Control: run the same on every face of the file and on a 2014 file; most faces should have
// zero unlabelled boundary edges, and labelled ones should form closed chains.
const L=require('./lib'),S=require(L.R+'/src'),fs=require('fs');
const file=process.argv[2]||'/home/user/sldprt-research-dump/test files online/2013/f666f342_head_face.sldprt';
const only=process.argv[3]?process.argv[3].split(',').map(Number):null;
const d=S.parse(fs.readFileSync(file));
let tot={faces:0,withUnl:0,unlEdges:0,overused:0};
// global map: unlabelled boundary edge keys -> faces (to test "not shared with any other display face")
const gl=new Map();const perFace=[];
d.faces.forEach((f,fi)=>{
  if(f.noEdgeTable)return;
  const {E,degen}=L.meshEdges(f);
  const bnd=[...E].filter(([p,e])=>e.uses===1),unl=bnd.filter(([p,e])=>e.ids.every(x=>x===0)),over=[...E].filter(([p,e])=>e.uses>2);
  const labelledInterior=[...E].filter(([p,e])=>e.uses===2&&e.ids.some(x=>x!==0));
  tot.faces++;if(unl.length){tot.withUnl++;tot.unlEdges+=unl.length;}tot.overused+=over.length;
  for(const [p] of bnd){if(!gl.has(p))gl.set(p,[]);gl.get(p).push(fi);}
  perFace[fi]={bnd:bnd.length,unl,degen,over:over.length,labInt:labelledInterior.length};
});
console.log('file',file.split('/').pop(),tot);
const list=only||perFace.map((x,i)=>x&&x.unl.length?i:-1).filter(i=>i>=0);
for(const fi of list){const x=perFace[fi];const ch=L.chains(x.unl);
  const shared=x.unl.filter(([p])=>gl.get(p).length>1).length;
  console.log('face',fi,'bnd',x.bnd,'unlabelled',x.unl.length,'degenTris',x.degen,'edges>2uses',x.over,'labelledInterior',x.labInt,'unl shared w/ other faces',shared,
    'chains',ch.map(c=>({n:c.nodes.length,closed:c.closed,deg:c.degHist})));
}
