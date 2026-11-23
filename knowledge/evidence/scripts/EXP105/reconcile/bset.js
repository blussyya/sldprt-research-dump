// Per display face: vertices in boundaryCycles vs vertices on a nonzero Block1 edge, by exact coordinates.
const S=require('/home/user/solidworks-converters/src');
const d=S.parse(require('fs').readFileSync(process.argv[2]));
const key=(f,i)=>[0,1,2].map(k=>f.vertices[3*i+k]).join(',');
let faces=0,diffFaces=0,onlyEdge=0,onlyCycle=0,noCycles=0,errs={};
for(const f of d.faces){ if(!f.edgeAnnotations)continue; faces++;
  const E=new Set();for(const e of f.edgeAnnotations)if(e.id!==0){E.add(key(f,e.vertices[0]));E.add(key(f,e.vertices[1]));}
  const C=new Set();
  if(!f.boundaryCycles){noCycles++;errs[f.boundaryError]=(errs[f.boundaryError]||0)+1;}
  else for(const c of f.boundaryCycles)for(const v of c.vertices)C.add(key(f,v));
  let a=0,b=0;for(const k of E)if(!C.has(k))a++;for(const k of C)if(!E.has(k))b++;
  if(a||b)diffFaces++;onlyEdge+=a;onlyCycle+=b;}
console.log(require('path').basename(process.argv[2]).slice(0,24),'faces',faces,'| faces where the sets differ',diffFaces,'| edge-only vertices',onlyEdge,'| cycle-only',onlyCycle,'| faces with no cycles',noCycles,JSON.stringify(errs));
