const C=require('./common');const J=require(C.SRC+'/brep/display-join');
const want={'3c4752f1':[705,39],'a0ab30c8':[88],'Dekor':[6338,8654]};
for(const [pat,ids] of Object.entries(want)){
  const f=C.corpusFiles().find(x=>x.includes(pat));const L=C.load(f);const r=J.join(L.display,L.M);
  L.display.forEach((d,i)=>{if(!ids.includes(d.metadata.rawId))return;const nf=r[i].face;
    console.log(pat,d.metadata.rawId,'tag',d.metadata.typeTag,nf.surface.type,'vc',d.vertexCount,'share',C.onSurfaceShare(d,nf,1e-5),'maxres',C.maxResidual(d,nf),'inBounds',C.inBounds(L.M,d,nf),'edges',C.edgeIds(L.M,d,nf));});
}
