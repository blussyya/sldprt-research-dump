'use strict';
/* The production-only geometry written exactly (EXP-078): INTERSECTION curves, tolerant edges,
 * swept surfaces, rolling-ball blends. Skips without the corpus. */
const test=require('node:test'),assert=require('assert/strict'),path=require('path');
const S=require('../src'),G=require('../src/geom/eval');
const {CORPUS,needsCorpus}=require('./helpers/common');
const part=name=>path.join(CORPUS,'test files original',name);
const model=name=>S.brep.model(S.readBrep(part(name)).parsed);

/* outward normal of each face against the display mesh normals at on-surface vertices */
function orientation(N,file,pick){
  const d=S.parse(file),byId=new Map(d.faces.map(f=>[f.metadata.rawId,f]));let agree=0,disagree=0;
  for(const F of N.faces){if(!pick(F))continue;const m=byId.get(F.id);let votes=0;
    for(let i=0;i<m.vertexCount;i+=2){const q=[0,1,2].map(k=>m.vertices[3*i+k]),r=G.surfaceDistance(F.surface,q);if(Math.abs(r.d)>1e-7)continue;
      votes+=Math.sign(G.dot(r.n,[0,1,2].map(k=>m.normals[3*i+k]))*(F.sameSense?1:-1));}
    if(votes>0)agree++;else disagree++;}
  return {agree,disagree};
}

test('INTERSECTION edges: marched curves lie on both of their surfaces to 1e-9 m',needsCorpus,t=>{
  let curves=0,worst=0;
  for(const name of ['distributor main boss rev a.SLDPRT','usb hub case (ultimate test)/USB hub case BOTTOM.SLDPRT','chainwheel.sldprt']){
    const p=S.readBrep(part(name)).parsed,by=new Map(p.nodes.map(n=>[n.index,n])),N=S.brep.model(p);
    for(const e of N.edges.values()){if(!e.curve.source||e.curve.source.type!=='INTERSECTION')continue;
      const x=by.get(e.curve.source.node),faces=N.faces.filter(F=>F.loops.some(l=>l.coedges.some(c=>c.edge===e.id)));
      const [a,b]=[e.curve.knots[0],e.curve.knots[e.curve.knots.length-1]];
      for(let k=0;k<=100;k++){const q=G.curvePoint(e.curve,a+(b-a)*k/100);for(const F of faces)worst=Math.max(worst,Math.abs(G.surfaceDistance(F.surface,q).d));}
      if(e.v){assert(G.dist(G.curvePoint(e.curve,a),N.vertices.get(e.v[0]).p)<1e-12);assert(G.dist(G.curvePoint(e.curve,b),N.vertices.get(e.v[1]).p)<1e-12);}
      assert(x.name==='INTERSECTION');curves++;}
  }
  assert.equal(curves,20+8+120);assert(worst<=1.5e-9,String(worst));
  t.diagnostic(`${curves} curves, worst distance to either face surface ${worst.toExponential(1)} m`);
});

test('tolerant edges: built from the fin curve, within 1e-9 m of it, ending on the vertices',needsCorpus,()=>{
  for(const [name,n,tol] of [['usb hub case (ultimate test)/USB hub case TOP.SLDPRT',7,1e-5],['Dekor.SLDPRT',20,5.05e-7]]){
    const N=model(name),E=[...N.edges.values()].filter(e=>e.curve.source&&e.curve.source.type==='SP_CURVE');
    assert.equal(E.length,n,name);
    for(const e of E){assert(e.curve.source.deviation<=1e-9);assert(e.tolerance<=tol*1.0001);
      const [a,b]=[e.curve.knots[0],e.curve.knots[e.curve.knots.length-1]];
      assert(G.dist(G.curvePoint(e.curve,a),N.vertices.get(e.v[0]).p)<1e-9,name+' start');assert(G.dist(G.curvePoint(e.curve,b),N.vertices.get(e.v[1]).p)<1e-9,name+' end');}
  }
});

test('SWEPT_SURF: linear extrusions, written exactly, facing the way the mesh does',needsCorpus,()=>{
  const N=model('Dekor.SLDPRT'),ext=N.faces.filter(F=>F.surface.type==='extrusion');
  assert.equal(ext.length,311);assert(ext.every(F=>G.norm(G.sub(F.surface.d,[0,0,1]))<1e-12));
  assert.deepEqual(orientation(N,part('Dekor.SLDPRT'),F=>F.surface.type==='extrusion'),{agree:311,disagree:0});
  const step=S.step.write(N,{name:'Dekor'}).text;assert.equal((step.match(/SURFACE_OF_LINEAR_EXTRUSION/g)||[]).length,311);
});

test('BLENDED_EDGE: rolling-ball blends fitted to 1e-8 m, facing the way the mesh does',needsCorpus,()=>{
  const N=model('Pocket Wheel.SLDPRT'),bl=N.faces.filter(F=>F.surface.source&&F.surface.source.type==='BLENDED_EDGE');
  assert.equal(bl.length,32);assert(bl.every(F=>F.surface.source.deviation<=1e-8&&Math.abs(F.surface.source.R-0.008)<1e-12));
  assert.deepEqual(orientation(N,part('Pocket Wheel.SLDPRT'),F=>F.surface.source&&F.surface.source.type==='BLENDED_EDGE'),{agree:32,disagree:0});
  // at every mesh vertex the fitted surface and the exact definition (8 mm from the spine) agree
  const p=S.readBrep(part('Pocket Wheel.SLDPRT')).parsed,by=new Map(p.nodes.map(n=>[n.index,n]));
  const sp=by.get(by.get(bl[0].surface.source.node).values.spine).values,spine={type:'ellipse',c:sp.centre,n:G.unit(sp.normal),x:G.unit(sp.x_axis),r1:sp.major_radius,r2:sp.minor_radius};
  const d=S.parse(part('Pocket Wheel.SLDPRT')),m=d.faces.find(f=>f.metadata.rawId===bl[0].id);let worst=0,on=0;
  for(let i=0;i<m.vertexCount;i++){const q=[0,1,2].map(k=>m.vertices[3*i+k]),fit=Math.abs(G.surfaceDistance(bl[0].surface,q).d),exact=Math.abs(G.curveProject(spine,q).d-0.008);
    if(exact<1e-6){worst=Math.max(worst,Math.abs(fit-exact));on++;}}   // off-surface ones are boundary chord points
  assert(worst<1e-8,String(worst));assert(on>m.vertexCount*0.8);
  // the blend whose second support is a radius-0 blend (a sharp edge), in USB hub TOP
  const T=model('usb hub case (ultimate test)/USB hub case TOP.SLDPRT').faces.filter(F=>F.surface.source&&F.surface.source.type==='BLENDED_EDGE');
  assert.equal(T.length,1);assert(T[0].surface.source.deviation<=1e-8);
});

test('exact volumes of real parts agree with OpenCascade on the same STEP',needsCorpus,()=>{
  // OpenCascade's analytic volumes of our files (EXP-078 OCC_RESULTS.json)
  for(const [name,occ] of [['distributor main boss rev a.SLDPRT',26264.468478],['usb hub case (ultimate test)/USB hub case BOTTOM.SLDPRT',6967.866980]]){
    const v=S.volume(part(name)).volume*1e9;assert(Math.abs(v-occ)<=1e-8*occ,`${name}: ${v} vs ${occ}`);}
});
