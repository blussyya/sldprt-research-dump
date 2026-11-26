// Claim 4 sweep. Every .sldprt under the three corpus folders, skipping exports* folders.
// Per display face, own reading (lib.readFace at the converter's record offsets, own strip walk,
// weld by exact float32 coordinates): mesh-boundary edges (used by one non-degenerate triangle) whose
// Block1 annotations are all 0. From the converter: boundaryCycles / boundaryError / noEdgeTable.
// Also an own scan of every [4,8,2,S] full record per file, compared with the converter's face count.
// Controls (run on the first file with labelled faces): zeroing one labelled Block1 id must be found
// by the scan and must make the converter's boundaryCycles fail or change; deleting one triangle must
// be found by the scan.
const fs=require('fs'),path=require('path');
const L=require('./lib');const display=require('/home/user/solidworks-converters/src/display');
const ROOT='/home/user/sldprt-research-dump';
function walk(d,out){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory()){if(/^exports/i.test(n.name))continue;walk(p,out);}else if(/\.sldprt$/i.test(n.name))out.push(p);}return out;}
const files=['test files online','test files new','test files original'].flatMap(d=>walk(path.join(ROOT,d),[]));
const res={files:files.length,filesWithFaces:0,faces:0,facesWithIds:0,facesBlock1NoIds:0,noEdgeTableFaces:0,noEdgeTableFiles:[],
  unlabelledBoundaryFaces:[],withIdsNoCycles:[],withIdsError:[],noCyclesFaces:{},ownScanMismatch:[],ownReadFail:[],degenerateTris:0,overUsedEdges:0,parseErrors:[],controls:{}};
let controlDone=false;
for(const file of files){const rel=path.relative(ROOT,file);let conv,dlb;
  try{conv=L.S.parse(file);}catch(e){res.parseErrors.push(rel+': '+e.message);continue;}
  if(!conv.faces.length){if(conv.errors&&conv.errors.length)res.parseErrors.push(rel+': '+conv.errors.join(';'));continue;}
  res.filesWithFaces++;
  try{dlb=L.dlBytes(file).dl;}catch(e){res.parseErrors.push(rel+' (own bytes): '+e.message);continue;}
  // own scan
  let own=0;for(let o=0;o+16<=dlb.length;o++)if(dlb[o]===4&&dlb[o+4]===8&&dlb[o+8]===2&&dlb.readUInt32LE(o)===4&&dlb.readUInt32LE(o+4)===8&&dlb.readUInt32LE(o+8)===2){const f=L.readFace(dlb,o);if(f&&f.ok)own++;}
  const withTable=conv.faces.filter(f=>!f.noEdgeTable).length;
  if(own!==withTable)res.ownScanMismatch.push({file:rel,own,converter:withTable,converterAll:conv.faces.length,rejected:conv.rejected.length});
  conv.faces.forEach((cf,fi)=>{res.faces++;
    if(cf.noEdgeTable){res.noEdgeTableFaces++;if(!res.noEdgeTableFiles.includes(rel))res.noEdgeTableFiles.push(rel);}
    const hasIds=cf.edgeAnnotations.some(e=>e.id!==0);
    if(hasIds)res.facesWithIds++;else if(!cf.noEdgeTable)res.facesBlock1NoIds++;
    if(hasIds&&!cf.boundaryCycles)res.withIdsNoCycles.push(rel+'#'+fi);
    if(hasIds&&cf.boundaryError)res.withIdsError.push(rel+'#'+fi+': '+cf.boundaryError);
    if(!cf.boundaryCycles||cf.boundaryError){const k=rel+(cf.noEdgeTable?' (no edge table)':' (has edge table)');res.noCyclesFaces[k]=(res.noCyclesFaces[k]||0)+1;}
    if(cf.noEdgeTable)return;
    const f=L.readFace(dlb,cf.offset);if(!f||!f.ok){res.ownReadFail.push(rel+'#'+fi);return;}
    const M=L.meshEdges(f);res.degenerateTris+=M.degenerate;res.overUsedEdges+=M.over.length;
    const un=M.boundary.filter(e=>e.ids.every(x=>x===0));
    if(un.length){const ch=L.chains(un);res.unlabelledBoundaryFaces.push({file:rel,face:fi,hasIds,unlabelled:un.length,noAnnotation:un.filter(e=>!e.ids.length).length,chains:ch.map(c=>c.edges+(c.closed?' closed':' open'))});}
  });
  // controls, once, on a face with ids and at least 2 strips
  if(!controlDone){const fi=conv.faces.findIndex(cf=>!cf.noEdgeTable&&cf.edgeAnnotations.some(e=>e.id)&&cf.stripLengths.length>=2&&cf.boundaryCycles&&!cf.boundaryError);
    if(fi>=0){controlDone=true;const cf=conv.faces[fi],f=L.readFace(dlb,cf.offset);
      const j=f.edges.findIndex(e=>e.id!==0);const g={...f,edges:f.edges.map((e,i)=>i===j?{...e,id:0}:e)};
      const un=L.meshEdges(g).boundary.filter(e=>e.ids.every(x=>x===0)).length;
      let conCycles;try{const c=display.boundaryCycles({...cf,edgeAnnotations:cf.edgeAnnotations.map((e,i)=>i===j?{...e,id:0}:e)});conCycles='cycles '+c.length+' (original '+cf.boundaryCycles.length+'), lengths '+c.map(x=>x.vertices.length).join('/')+' vs '+cf.boundaryCycles.map(x=>x.vertices.length).join('/');}catch(e){conCycles='error: '+e.message;}
      const M0=L.meshEdges(f);const ti=f.tris.findIndex(t=>{const k=t.map(i=>M0.K[i]);return [0,1,2].every(q=>{const a=k[q],b=k[(q+1)%3];const u=M0.use.get(a<b?a+'|'+b:b+'|'+a);return u&&u.n===2;});});
      const h={...f,tris:f.tris.filter((_,i)=>i!==ti)};const un2=ti>=0?L.meshEdges(h).boundary.filter(e=>e.ids.every(x=>x===0)).length:null;
      res.controls={file:rel,face:fi,zeroOneId:{unlabelledFound:un,converterBoundaryCycles:conCycles},deleteOneInteriorTriangle:{triangle:ti,unlabelledFound:un2}};}}
}
fs.writeFileSync(path.join(__dirname,'sweep.out.json'),JSON.stringify(res,null,1));
console.log(JSON.stringify({...res,unlabelledBoundaryFaces:res.unlabelledBoundaryFaces.length,noEdgeTableFiles:res.noEdgeTableFiles},null,1));
console.log('faces with unlabelled mesh-boundary edges:');for(const u of res.unlabelledBoundaryFaces)console.log(' ',JSON.stringify(u));
