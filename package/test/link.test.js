'use strict';
/* Display mesh joined to the exact B-rep (src/link.js). Skips without the corpus. */
const test=require('node:test'),assert=require('assert/strict'),path=require('path');
const S=require('../src'),{join}=require('../src/link');
const {walk}=require('./helpers/corpus');
const {CORPUS,needsCorpus}=require('./helpers/common');

const files=()=>[...walk(path.join(CORPUS,'test files new')),...walk(path.join(CORPUS,'test files original'))];

test('every part with a solid links all of its faces: by face ID, edge set, or geometry',needsCorpus,t=>{
  const n={files:0,faces:0,id:0,edges:0,geometry:0};
  for(const f of files()){
    if(/SW2000-s01/.test(f))continue;   // no solid
    const L=S.link(f);n.files++;
    assert.deepEqual(L.unmatched,{mesh:[],brep:[]},f);
    for(const x of L.faces){n.faces++;n[x.method]++;}
  }
  assert.deepEqual(n,{files:72,faces:1762,id:1414,edges:328,geometry:20});
  t.diagnostic(`${n.files} files, ${n.faces} faces: ${n.id} by ID, ${n.edges} by edge set, ${n.geometry} by geometry`);
});

test('the edge-set and geometry joins agree with the face IDs where both exist',needsCorpus,t=>{
  let edges=0,geometry=0;
  for(const f of files()){
    if(/SW2000-s01/.test(f))continue;
    const d=S.parse(f);if(!d.faces.some(x=>x.metadata))continue;
    const N=S.brep.model(S.readBrep(f).parsed);
    const j=join({...d,faces:d.faces.map(x=>({...x,metadata:null}))},N);
    for(const x of j.faces){assert.equal(x.id,d.faces[x.index].metadata.rawId,f+' '+x.method);if(x.method==='edges')edges++;}
    if(N.faces.length>40)continue;   // geometry-only matching is quadratic; the small parts suffice
    const g=join({...d,faces:d.faces.map(x=>({...x,metadata:null,edgeAnnotations:[]}))},N);
    for(const x of g.faces){assert.equal(x.id,d.faces[x.index].metadata.rawId,f+' geometry');geometry++;}
  }
  assert(edges>1300&&geometry>250,`${edges} ${geometry}`);
  t.diagnostic(`edge-set join right on ${edges} faces, geometry join right on ${geometry}, none wrong`);
});
