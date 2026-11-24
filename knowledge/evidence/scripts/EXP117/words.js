// EXP-117: the four Block1 words of chainwheel's control-0 strips, and with the order 2,1,3 the
// cycles' edge ids against the native face's edges (display ids).
const S=require('/home/user/solidworks-converters/src'),N=require('/home/user/solidworks-converters/src/brep/native'),J=require('/home/user/solidworks-converters/src/brep/display-join'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf);
const W=[0,0,0,0].map(()=>({zero:0,nonzero:0}));let strips=0;
for(const f of d.faces){let t=0;f.stripLengths.forEach((n,s)=>{const w=f.block1.slice(t,t+2*n-2);t+=2*n-2;if(f.stripControls[s]===0&&n===3){strips++;w.forEach((x,i)=>W[i][x?'nonzero':'zero']++);}});}
console.log('control-0 strips',strips,'words 0..3:',JSON.stringify(W));
let M,js;try{M=N.build(S.readBrep(buf).parsed);js=J.join(d.faces,M);}catch(e){console.log('native:',e.message);}
if(js){let same=0,diff=0,unj=0;d.faces.forEach((f,fi)=>{const nf=js[fi]&&js[fi].face;if(!nf){unj++;return;}
  const ids=new Set();let t=0;f.stripLengths.forEach((n,s)=>{const w=f.block1.slice(t,t+2*n-2);t+=2*n-2;
    if(f.stripControls[s]===0&&n===3){for(const x of [w[2],w[1],w[3]])if(x)ids.add(x);}else for(let i=1;i<w.length;i++)if(w[i])ids.add(w[i]);});
  const nat=new Set();for(const l of nf.loops)for(const ce of l.coedges){const e=M.edges.get(ce.edge);nat.add(e.displayId!==undefined?e.displayId:e.id);}
  (ids.size===nat.size&&[...ids].every(x=>nat.has(x))?same++:diff++);});
  console.log('faces whose display edge ids (order 2,1,3) equal the native face edges:',same,'differ:',diff,'unjoined:',unj);}
