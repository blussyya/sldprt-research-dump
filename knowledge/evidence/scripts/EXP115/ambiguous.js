// EXP-115 (NQ-072): why the display boundary graph is ambiguous. For each face where
// boundaryCycles gives up: node degrees, the edge ids at nodes of degree other than 2, and whether
// those ids are seams in the native B-rep (both coedges of the edge on the same face).
const R='/home/user/solidworks-converters',S=require(R+'/src'),N=require(R+'/src/brep/native'),
  J=require(R+'/src/brep/display-join'),fs=require('fs');
const buf=fs.readFileSync(process.argv[2]),d=S.parse(buf),M=N.build(S.readBrep(buf).parsed),js=J.join(d.faces,M);
const tally={faces:0,degHist:{},badIdsSeam:0,badIdsNotSeam:0,badIdsNoNative:0},ex=[];
d.faces.forEach((f,fi)=>{if(f.boundaryCycles||!/Ambiguous/.test(f.boundaryError||''))return;tally.faces++;
  const key=i=>[0,1,2].map(k=>f.vertices[3*i+k]).join(','),adj=new Map(),segsPerId=new Map();
  for(const e of f.edgeAnnotations)if(e.id!==0){const a=key(e.vertices[0]),b=key(e.vertices[1]);
    for(const [x,y] of [[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({to:y,id:e.id});}
    segsPerId.set(e.id,(segsPerId.get(e.id)||0)+1);}
  const nf=js[fi]&&js[fi].face,uses=new Map();
  if(nf)for(const l of nf.loops)for(const ce of l.coedges){const e=M.edges.get(ce.edge),k=e.displayId!==undefined?e.displayId:e.id;uses.set(k,(uses.get(k)||0)+1);}
  const bad=new Set();for(const [k,es] of adj){tally.degHist[es.length]=(tally.degHist[es.length]||0)+1;if(es.length!==2)for(const e of es)bad.add(e.id);}
  for(const id of bad){const u=uses.get(id);if(u===undefined)tally.badIdsNoNative++;else if(u>=2)tally.badIdsSeam++;else tally.badIdsNotSeam++;}
  if(ex.length<4)ex.push({fi,surface:nf&&nf.surface.type,loops:nf&&nf.loops.length,badIds:[...bad].map(id=>({id,segments:segsPerId.get(id),nativeUses:uses.get(id)}))});
});
console.log(require('path').basename(process.argv[2]).slice(0,24),JSON.stringify(tally));for(const e of ex)console.log('   ',JSON.stringify(e));
