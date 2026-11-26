// The display faces that have a Block1 but no nonzero edge id: where they are, their own-reading
// mesh-boundary edge count (0 means a closed mesh), and the converter's boundaryCycles.
const fs=require('fs'),path=require('path');const L=require('./lib');
const ROOT='/home/user/sldprt-research-dump';
function walk(d,out){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory()){if(/^exports/i.test(n.name))continue;walk(p,out);}else if(/\.sldprt$/i.test(n.name))out.push(p);}return out;}
for(const file of ['test files online','test files new','test files original'].flatMap(d=>walk(path.join(ROOT,d),[]))){
  const conv=L.S.parse(file);if(!conv.faces.length)continue;let dl=null;
  conv.faces.forEach((cf,fi)=>{if(cf.noEdgeTable||cf.edgeAnnotations.some(e=>e.id))return;dl=dl||L.dlBytes(file).dl;const f=L.readFace(dl,cf.offset),M=L.meshEdges(f);
    console.log(path.relative(ROOT,file),'face',fi,'triangles',f.tris.length,'mesh-boundary edges',M.boundary.length,'boundaryCycles',JSON.stringify(cf.boundaryCycles),'error',cf.boundaryError,'tag',cf.metadata&&cf.metadata.typeTag);});}
