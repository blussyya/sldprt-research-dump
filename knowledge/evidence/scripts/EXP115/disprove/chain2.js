const {S,ROOT}=require('./lib');
const d=S.parse(ROOT+'test files original/chainwheel.sldprt');const f=d.faces[1];
console.log('vc',f.vertexCount,'strips',f.stripLengths,'controls',f.stripControls&&f.stripControls.slice(0,20));
for(let i=0;i<f.vertexCount;i++)console.log(i,[0,1,2].map(k=>f.vertices[3*i+k].toFixed(6)).join(' '));
console.log('tri',Array.from(f.triangleIndices).join(' '));
console.log('ann',f.edgeAnnotations.map(e=>e.vertices.join('-')+':'+e.id).join(' '));
console.log('block1',Array.from(f.block1).join(' '));
console.log('block2',Array.from(f.block2).join(' '));
