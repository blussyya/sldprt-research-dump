const {S,ROOT,key}=require('./lib');const {fanWalk}=require('./fan');const {simpleLoops}=require('./simpleloops');
const d=S.parse(ROOT+'test files online/2013/f666f342_head_face.sldprt');
const ids=[];
d.faces.forEach((f,i)=>{if(f.noEdgeTable)return;
  const w=new Map();const W=x=>{const k=key(f,x);if(!w.has(k))w.set(k,w.size);return w.get(k);};
  const pk=(a,b)=>a<b?a+'|'+b:b+'|'+a;const cut=new Set();for(const e of f.edgeAnnotations)if(e.id){const a=W(e.vertices[0]),b=W(e.vertices[1]);if(a!==b)cut.add(pk(a,b));}
  const cnt=new Map();for(let t=0;t<f.triangleIndices.length;t+=3){const v=[0,1,2].map(j=>W(f.triangleIndices[t+j]));for(let j=0;j<3;j++){const k=pk(v[j],v[(j+1)%3]);cnt.set(k,(cnt.get(k)||0)+1);}}
  let o=0;for(const [k,c] of cnt)if(c===1&&!cut.has(k))o++;
  if(o){const r=fanWalk(f);ids.push(i);
    console.log('face',i,'verts',f.vertexCount,'tris',f.triangleIndices.length/3,'strips',f.stripLengths.length,'controls',[...new Set(f.stripControls)],'cut',cut.size,'openNotCut',o,'fan loops',r.loops.length,'closed',r.loops.every(l=>l.closed),'problems',r.problems.length,'simple',simpleLoops(f)?'ok':'null','meta',f.metadata&&{raw:f.metadata.rawId,tag:f.metadata.typeTag,edgeRecs:f.metadata.edgeRecords.length},'boundaryError',f.boundaryError);}
});
